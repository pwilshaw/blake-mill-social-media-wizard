// T065 — Metrics Sync Cron (every 15 min)
// Fetches post insights from Meta Graph API v22.0 for all published channel_posts.
// Updates impressions, clicks, engagement_count, spend.
// Creates PerformanceSnapshot records per campaign.
// Writes SpendLog entries per campaign+channel.
// Checks budget rules — auto-pauses campaigns that exceed their limit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelPostRow {
  id: string
  campaign_id: string
  channel_account_id: string
  platform_post_id: string | null
  status: string
  impressions: number
  clicks: number
  engagement_count: number
  spend: number
}

interface ChannelAccountRow {
  id: string
  platform: string
  access_token: string
}

interface MetaInsights {
  impressions: number
  clicks: number
  reach: number
  spend: number
  reactions: number
  comments: number
  shares: number
}

interface BudgetRuleRow {
  id: string
  scope: string
  campaign_id: string | null
  channel_account_id: string | null
  limit_amount: number
  current_spend: number
  alert_threshold_pct: number
  auto_pause: boolean
}

// ---------------------------------------------------------------------------
// Meta API helpers
// ---------------------------------------------------------------------------

async function fetchMetaInsights(
  postId: string,
  accessToken: string
): Promise<MetaInsights | null> {
  const fields = 'insights.metric(post_impressions,post_clicks,post_reactions_by_type_total,post_shares)'
  const url = `https://graph.facebook.com/v22.0/${postId}?fields=${fields}&access_token=${accessToken}`

  try {
    const res = await fetch(url)
    if (!res.ok) return null

    // deno-lint-ignore no-explicit-any
    const data = await res.json() as Record<string, any>
    const insightData = data.insights?.data ?? []

    const getValue = (name: string): number => {
      const entry = insightData.find((d: { name: string; values: { value: number }[] }) => d.name === name)
      return entry?.values?.[0]?.value ?? 0
    }

    const reactions = getValue('post_reactions_by_type_total')
    const shares = getValue('post_shares')

    return {
      impressions: getValue('post_impressions'),
      clicks: getValue('post_clicks'),
      reach: 0,
      spend: 0, // Organic posts have no spend; paid would require Ads Insights API
      reactions: typeof reactions === 'object' ? Object.values(reactions as Record<string, number>).reduce((a, b) => a + b, 0) : reactions,
      comments: 0,
      shares: typeof shares === 'number' ? shares : 0,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  try {
    // 1. Fetch published channel posts
    const { data: posts, error: postsError } = await client
      .from('channel_posts')
      .select('id, campaign_id, channel_account_id, platform_post_id, status, impressions, clicks, engagement_count, spend')
      .eq('status', 'published')
      .not('platform_post_id', 'is', null)

    if (postsError) return jsonResponse({ error: postsError.message }, 500)
    if (!posts || posts.length === 0) return jsonResponse({ synced: 0 })

    // 2. Fetch channel accounts (need access tokens)
    const { data: channels } = await client
      .from('channel_accounts')
      .select('id, platform, access_token')
      .eq('is_active', true)

    const channelMap = new Map<string, ChannelAccountRow>(
      ((channels ?? []) as ChannelAccountRow[]).map((c) => [c.id, c])
    )

    // 3. Sync insights for each post
    const spendDelta = new Map<string, Map<string, number>>() // campaignId -> channelId -> spend delta

    let syncCount = 0
    for (const post of posts as ChannelPostRow[]) {
      const channel = channelMap.get(post.channel_account_id)
      if (!channel || !post.platform_post_id) continue

      const insights = await fetchMetaInsights(post.platform_post_id, channel.access_token)
      if (!insights) continue

      const engagementCount = insights.reactions + insights.comments + insights.shares
      const newSpend = post.spend + insights.spend

      await client
        .from('channel_posts')
        .update({
          impressions: insights.impressions,
          clicks: insights.clicks,
          engagement_count: engagementCount,
          spend: newSpend,
        })
        .eq('id', post.id)

      // Track spend delta
      if (insights.spend > 0) {
        const campaignMap = spendDelta.get(post.campaign_id) ?? new Map<string, number>()
        campaignMap.set(
          post.channel_account_id,
          (campaignMap.get(post.channel_account_id) ?? 0) + insights.spend
        )
        spendDelta.set(post.campaign_id, campaignMap)

        // Write SpendLog entry
        await client.from('spend_logs').insert({
          campaign_id: post.campaign_id,
          channel_account_id: post.channel_account_id,
          amount: insights.spend,
          currency: 'GBP',
          logged_at: new Date().toISOString(),
          description: `Metrics sync — post ${post.id}`,
        })
      }

      syncCount++
    }

    // 4. Aggregate per-campaign metrics and create PerformanceSnapshot
    const { data: activeCampaigns } = await client
      .from('campaigns')
      .select('id')
      .eq('status', 'active')

    for (const campaign of (activeCampaigns ?? []) as { id: string }[]) {
      const { data: campaignPosts } = await client
        .from('channel_posts')
        .select('impressions, clicks, engagement_count, spend')
        .eq('campaign_id', campaign.id)
        .eq('status', 'published')

      if (!campaignPosts || campaignPosts.length === 0) continue

      type PostMetrics = { impressions: number; clicks: number; engagement_count: number; spend: number }
      const totals = (campaignPosts as PostMetrics[]).reduce(
        (acc, p) => ({
          impressions: acc.impressions + p.impressions,
          clicks: acc.clicks + p.clicks,
          spend: acc.spend + p.spend,
          conversions: acc.conversions,
        }),
        { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
      )

      const roi = totals.spend > 0 ? (totals.conversions / totals.spend) * 100 : 0

      await client.from('performance_snapshots').insert({
        campaign_id: campaign.id,
        snapshot_at: new Date().toISOString(),
        total_impressions: totals.impressions,
        total_clicks: totals.clicks,
        total_spend: totals.spend,
        total_conversions: totals.conversions,
        roi,
        ai_rating: null,
        ai_commentary: null,
      })
    }

    // 5. Check budget rules and auto-pause breaching campaigns
    const { data: budgetRules } = await client
      .from('budget_rules')
      .select('id, scope, campaign_id, channel_account_id, limit_amount, current_spend, alert_threshold_pct, auto_pause')
      .eq('auto_pause', true)

    for (const rule of (budgetRules ?? []) as BudgetRuleRow[]) {
      // Add any new spend to current_spend
      let additionalSpend = 0

      if (rule.scope === 'campaign' && rule.campaign_id) {
        const channelDeltas = spendDelta.get(rule.campaign_id)
        if (channelDeltas) {
          for (const delta of channelDeltas.values()) additionalSpend += delta
        }
      } else if (rule.scope === 'channel' && rule.channel_account_id) {
        for (const channelDeltas of spendDelta.values()) {
          additionalSpend += channelDeltas.get(rule.channel_account_id) ?? 0
        }
      } else if (rule.scope === 'global') {
        for (const channelDeltas of spendDelta.values()) {
          for (const delta of channelDeltas.values()) additionalSpend += delta
        }
      }

      const updatedSpend = rule.current_spend + additionalSpend

      await client
        .from('budget_rules')
        .update({ current_spend: updatedSpend })
        .eq('id', rule.id)

      if (updatedSpend >= rule.limit_amount && rule.auto_pause && rule.campaign_id) {
        await client
          .from('campaigns')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('id', rule.campaign_id)
          .eq('status', 'active')
      }
    }

    return jsonResponse({ synced: syncCount, snapshots: activeCampaigns?.length ?? 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
