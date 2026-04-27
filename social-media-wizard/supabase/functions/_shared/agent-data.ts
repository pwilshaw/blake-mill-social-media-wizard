// Per-agent data slices. Each function returns a JSON-serialisable summary
// the agent prompt can include verbatim, plus a data_quality flag the agent
// uses to decide how confident to be.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AgentKey } from './agent-context.ts'

export type DataQuality = 'thin' | 'fair' | 'rich'

export interface AgentDataSlice {
  agent_key: AgentKey
  window_days: number
  data_quality: DataQuality
  summary: Record<string, unknown>
}

const WINDOW_DAYS = 60

export async function getAgentDataSlice(
  client: SupabaseClient,
  agent_key: AgentKey,
): Promise<AgentDataSlice> {
  switch (agent_key) {
    case 'social_media':
      return socialMediaSlice(client)
    case 'cro':
      return croSlice(client)
    case 'acquisition':
      return acquisitionSlice(client)
  }
}

// ---------------------------------------------------------------------------
// Social Media
// ---------------------------------------------------------------------------

interface PostRow {
  id: string
  status: string
  published_at: string | null
  impressions: number
  clicks: number
  engagement_count: number
  spend: number
  content_variants: {
    platform: string
    angle_label: string | null
    call_to_action: string | null
    hashtags: string[] | null
    campaigns: { is_organic: boolean | null } | null
  } | null
}

async function socialMediaSlice(client: SupabaseClient): Promise<AgentDataSlice> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString()
  const { data: posts } = await client
    .from('channel_posts')
    .select(`
      id, status, published_at, impressions, clicks, engagement_count, spend,
      content_variants!inner (
        platform, angle_label, call_to_action, hashtags,
        campaigns!inner ( is_organic )
      )
    `)
    .eq('status', 'published')
    .gte('published_at', since)
    .returns<PostRow[]>()

  const rows = posts ?? []

  const byPlatform = new Map<string, { posts: number; impressions: number; engagement: number; spend: number }>()
  const byAngle = new Map<string, { posts: number; engRate: number; total: number }>()
  const byDow = new Array(7).fill(0).map(() => ({ posts: 0, impressions: 0, engagement: 0 }))

  let totalEngRate = 0
  let topPosts: { platform: string; eng_rate: number; impressions: number; cta: string | null; angle: string | null }[] = []

  for (const p of rows) {
    const platform = p.content_variants?.platform ?? 'unknown'
    const angle = p.content_variants?.angle_label ?? 'unlabelled'
    const engRate = p.impressions > 0 ? (p.engagement_count / p.impressions) * 100 : 0

    const pAgg = byPlatform.get(platform) ?? { posts: 0, impressions: 0, engagement: 0, spend: 0 }
    pAgg.posts += 1
    pAgg.impressions += p.impressions
    pAgg.engagement += p.engagement_count
    pAgg.spend += p.spend
    byPlatform.set(platform, pAgg)

    const aAgg = byAngle.get(angle) ?? { posts: 0, engRate: 0, total: 0 }
    aAgg.posts += 1
    aAgg.total += engRate
    aAgg.engRate = aAgg.total / aAgg.posts
    byAngle.set(angle, aAgg)

    if (p.published_at) {
      const dow = new Date(p.published_at).getUTCDay()
      byDow[dow].posts += 1
      byDow[dow].impressions += p.impressions
      byDow[dow].engagement += p.engagement_count
    }
    totalEngRate += engRate

    if (p.impressions >= 50) {
      topPosts.push({
        platform,
        eng_rate: Number(engRate.toFixed(2)),
        impressions: p.impressions,
        cta: p.content_variants?.call_to_action ?? null,
        angle: p.content_variants?.angle_label ?? null,
      })
    }
  }
  topPosts = topPosts.sort((a, b) => b.eng_rate - a.eng_rate).slice(0, 5)

  const data_quality: DataQuality =
    rows.length === 0 ? 'thin' : rows.length < 20 ? 'thin' : rows.length < 60 ? 'fair' : 'rich'

  return {
    agent_key: 'social_media',
    window_days: WINDOW_DAYS,
    data_quality,
    summary: {
      total_posts: rows.length,
      avg_engagement_rate_pct: rows.length > 0 ? Number((totalEngRate / rows.length).toFixed(2)) : 0,
      by_platform: Array.from(byPlatform.entries()).map(([platform, a]) => ({
        platform,
        posts: a.posts,
        impressions: a.impressions,
        engagement_rate_pct: a.impressions > 0 ? Number(((a.engagement / a.impressions) * 100).toFixed(2)) : 0,
        spend_gbp: Number(a.spend.toFixed(2)),
      })),
      by_angle: Array.from(byAngle.entries()).map(([angle, a]) => ({
        angle,
        posts: a.posts,
        avg_engagement_rate_pct: Number(a.engRate.toFixed(2)),
      })),
      by_day_of_week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({
        day,
        posts: byDow[i].posts,
        engagement_rate_pct: byDow[i].impressions > 0
          ? Number(((byDow[i].engagement / byDow[i].impressions) * 100).toFixed(2))
          : 0,
      })),
      top_posts: topPosts,
    },
  }
}

// ---------------------------------------------------------------------------
// CRO
// ---------------------------------------------------------------------------

interface CampaignRow {
  id: string
  name: string
  status: string
  is_organic: boolean | null
  budget_limit: number | null
  budget_spent: number
}

interface ShirtRow {
  id: string
  name: string
  stock_status: string
}

async function croSlice(client: SupabaseClient): Promise<AgentDataSlice> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString()

  const [campaignsResp, postsResp, shirtsResp, creativesResp] = await Promise.all([
    client.from('campaigns').select('id, name, status, is_organic, budget_limit, budget_spent').gte('created_at', since).returns<CampaignRow[]>(),
    client
      .from('channel_posts')
      .select('id, impressions, clicks, engagement_count, spend, content_variants!inner(platform, campaigns!inner(is_organic))')
      .eq('status', 'published')
      .gte('published_at', since),
    client.from('shirt_products').select('id, name, stock_status').returns<ShirtRow[]>(),
    client.from('creative_assets').select('id, approval_status'),
  ])

  const campaigns = campaignsResp.data ?? []
  const posts = (postsResp.data ?? []) as Array<{
    impressions: number; clicks: number; engagement_count: number; spend: number
    content_variants: { platform: string; campaigns: { is_organic: boolean | null } | null } | null
  }>
  const shirts = shirtsResp.data ?? []
  const creatives = (creativesResp.data ?? []) as Array<{ approval_status: string }>

  const totalImpressions = posts.reduce((s, p) => s + p.impressions, 0)
  const totalClicks = posts.reduce((s, p) => s + p.clicks, 0)
  const totalSpend = posts.reduce((s, p) => s + p.spend, 0)
  const ctr_pct = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  const organicPosts = posts.filter((p) => p.content_variants?.campaigns?.is_organic === true)
  const paidPosts = posts.filter((p) => p.content_variants?.campaigns?.is_organic !== true)
  const organicCtr = sumDiv(organicPosts.map((p) => p.clicks), organicPosts.map((p) => p.impressions))
  const paidCtr = sumDiv(paidPosts.map((p) => p.clicks), paidPosts.map((p) => p.impressions))

  const stockBreakdown = shirts.reduce<Record<string, number>>((acc, s) => {
    acc[s.stock_status] = (acc[s.stock_status] ?? 0) + 1
    return acc
  }, {})
  const outOfStock = shirts.filter((s) => s.stock_status === 'out_of_stock').slice(0, 5).map((s) => s.name)

  const approvalBreakdown = creatives.reduce<Record<string, number>>((acc, c) => {
    acc[c.approval_status] = (acc[c.approval_status] ?? 0) + 1
    return acc
  }, {})

  const data_quality: DataQuality =
    posts.length === 0 ? 'thin' : posts.length < 20 ? 'thin' : 'fair'

  return {
    agent_key: 'cro',
    window_days: WINDOW_DAYS,
    data_quality,
    summary: {
      total_posts: posts.length,
      total_campaigns: campaigns.length,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_spend_gbp: Number(totalSpend.toFixed(2)),
      ctr_pct: Number(ctr_pct.toFixed(2)),
      organic_ctr_pct: Number((organicCtr * 100).toFixed(2)),
      paid_ctr_pct: Number((paidCtr * 100).toFixed(2)),
      conversion_data_wired: false,
      stock_breakdown: stockBreakdown,
      out_of_stock_examples: outOfStock,
      creative_approval_breakdown: approvalBreakdown,
    },
  }
}

function sumDiv(num: number[], den: number[]): number {
  const n = num.reduce((a, b) => a + b, 0)
  const d = den.reduce((a, b) => a + b, 0)
  return d > 0 ? n / d : 0
}

// ---------------------------------------------------------------------------
// Acquisition
// ---------------------------------------------------------------------------

interface SegmentRow {
  id: string
  name: string
  age_range: string | null
  style_preference: string | null
  purchase_intent: string | null
  member_count: number | null
  purchase_occasions: string[] | null
  source: string
}

async function acquisitionSlice(client: SupabaseClient): Promise<AgentDataSlice> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString()

  const [segResp, postsResp, channelResp] = await Promise.all([
    client.from('customer_segments').select('id, name, age_range, style_preference, purchase_intent, member_count, purchase_occasions, source').returns<SegmentRow[]>(),
    client
      .from('channel_posts')
      .select('id, impressions, engagement_count, spend, content_variants!inner(platform)')
      .eq('status', 'published')
      .gte('published_at', since),
    client.from('channel_accounts').select('platform, is_active').eq('is_active', true),
  ])

  const segments = segResp.data ?? []
  const posts = (postsResp.data ?? []) as Array<{
    impressions: number; engagement_count: number; spend: number
    content_variants: { platform: string } | null
  }>
  const channels = (channelResp.data ?? []) as Array<{ platform: string }>

  const channelEfficiency = new Map<string, { impressions: number; spend: number; engagement: number }>()
  for (const p of posts) {
    const platform = p.content_variants?.platform ?? 'unknown'
    const agg = channelEfficiency.get(platform) ?? { impressions: 0, spend: 0, engagement: 0 }
    agg.impressions += p.impressions
    agg.spend += p.spend
    agg.engagement += p.engagement_count
    channelEfficiency.set(platform, agg)
  }

  const topSegments = segments
    .slice()
    .sort((a, b) => {
      const aw = (a.member_count ?? 0) * (a.purchase_intent === 'high' ? 3 : a.purchase_intent === 'medium' ? 2 : 1)
      const bw = (b.member_count ?? 0) * (b.purchase_intent === 'high' ? 3 : b.purchase_intent === 'medium' ? 2 : 1)
      return bw - aw
    })
    .slice(0, 5)
    .map((s) => ({
      name: s.name,
      members: s.member_count,
      intent: s.purchase_intent,
      style: s.style_preference,
      age: s.age_range,
      occasions: s.purchase_occasions,
      source: s.source,
    }))

  const data_quality: DataQuality =
    segments.length === 0 ? 'thin' : segments.length < 5 ? 'thin' : 'fair'

  return {
    agent_key: 'acquisition',
    window_days: WINDOW_DAYS,
    data_quality,
    summary: {
      total_segments: segments.length,
      total_members_across_segments: segments.reduce((s, x) => s + (x.member_count ?? 0), 0),
      active_channels: channels.map((c) => c.platform),
      top_segments: topSegments,
      channel_efficiency: Array.from(channelEfficiency.entries()).map(([platform, a]) => ({
        platform,
        impressions: a.impressions,
        spend_gbp: Number(a.spend.toFixed(2)),
        engagement_per_pound: a.spend > 0 ? Number((a.engagement / a.spend).toFixed(2)) : null,
      })),
      ltv_data_wired: false,
      repeat_purchase_data_wired: false,
    },
  }
}
