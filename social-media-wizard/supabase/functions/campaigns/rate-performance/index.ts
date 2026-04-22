// T066 — Rate Performance Edge Function
// POST /functions/v1/campaigns/rate-performance
// Body: { campaign_id: string }
//
// Fetches campaign metrics and comment data.
// Calls Claude API for an honest 1–10 performance rating with commentary.
// Updates campaign.performance_rating and creates PerformanceSnapshot
// with ai_rating + ai_commentary.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.24.3'
import { getIntegrationKey } from '../../_shared/integration-credentials.ts'

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

interface RateRequestBody {
  campaign_id: string
}

interface PerformanceSnapshotRow {
  total_impressions: number
  total_clicks: number
  total_spend: number
  total_conversions: number
  roi: number
  snapshot_at: string
}

interface EngagementReplyRow {
  comment_text: string
  sentiment: string
}

interface ClaudeRating {
  rating: number
  commentary: string
}

// ---------------------------------------------------------------------------
// Claude prompt
// ---------------------------------------------------------------------------

function buildRatingPrompt(
  campaignName: string,
  metrics: PerformanceSnapshotRow | null,
  comments: EngagementReplyRow[]
): string {
  const metricsSection = metrics
    ? `
- Impressions: ${metrics.total_impressions.toLocaleString()}
- Clicks: ${metrics.total_clicks.toLocaleString()}
- Spend: £${metrics.total_spend.toFixed(2)}
- Conversions: ${metrics.total_conversions}
- ROI: ${metrics.roi.toFixed(1)}%
- Click-through rate: ${metrics.total_impressions > 0 ? ((metrics.total_clicks / metrics.total_impressions) * 100).toFixed(2) : '0'}%`
    : 'No metrics available yet.'

  const commentsSection =
    comments.length > 0
      ? comments
          .slice(0, 20)
          .map((c) => `[${c.sentiment}] ${c.comment_text}`)
          .join('\n')
      : 'No comments recorded.'

  return `You are an honest, data-driven social media performance analyst. Rate the following campaign performance on a scale of 1–10, where 1 is very poor and 10 is exceptional. Be critical and accurate — do not inflate scores.

Campaign: "${campaignName}"

METRICS:
${metricsSection}

AUDIENCE COMMENTS (sample):
${commentsSection}

Respond with valid JSON only, in this exact format:
{
  "rating": <integer 1–10>,
  "commentary": "<2–3 sentence honest assessment covering what worked, what did not, and one specific improvement>"
}`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const anthropicApiKey = await getIntegrationKey(client, {
    provider: 'anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
  })
  if (!anthropicApiKey) {
    return jsonResponse({ error: 'Anthropic API key not configured. Add one in Integrations.' }, 500)
  }
  const anthropic = new Anthropic({ apiKey: anthropicApiKey })

  let body: RateRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { campaign_id } = body
  if (!campaign_id) return jsonResponse({ error: 'campaign_id is required' }, 422)

  try {
    // 1. Fetch campaign
    const { data: campaign, error: campaignError } = await client
      .from('campaigns')
      .select('id, name, status')
      .eq('id', campaign_id)
      .single()

    if (campaignError) {
      return jsonResponse({ error: campaignError.message }, campaignError.code === 'PGRST116' ? 404 : 500)
    }

    // 2. Fetch latest performance snapshot
    const { data: snapshot } = await client
      .from('performance_snapshots')
      .select('total_impressions, total_clicks, total_spend, total_conversions, roi, snapshot_at')
      .eq('campaign_id', campaign_id)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single()

    // 3. Fetch comment data (via engagement_replies → channel_posts)
    const { data: channelPostIds } = await client
      .from('channel_posts')
      .select('id')
      .eq('campaign_id', campaign_id)

    const postIds = ((channelPostIds ?? []) as { id: string }[]).map((p) => p.id)

    let comments: EngagementReplyRow[] = []
    if (postIds.length > 0) {
      const { data: replies } = await client
        .from('engagement_replies')
        .select('comment_text, sentiment')
        .in('channel_post_id', postIds)
        .order('created_at', { ascending: false })
        .limit(30)
      comments = (replies ?? []) as EngagementReplyRow[]
    }

    // 4. Call Claude API
    const prompt = buildRatingPrompt(
      campaign.name,
      snapshot as PerformanceSnapshotRow | null,
      comments
    )

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') {
      return jsonResponse({ error: 'Unexpected Claude response type' }, 502)
    }

    let parsed: ClaudeRating
    try {
      parsed = JSON.parse(rawContent.text) as ClaudeRating
    } catch {
      return jsonResponse({ error: 'Failed to parse Claude rating response', raw: rawContent.text }, 502)
    }

    const rating = Math.max(1, Math.min(10, Math.round(parsed.rating)))

    // 5. Update campaign.performance_rating
    await client
      .from('campaigns')
      .update({ performance_rating: rating, updated_at: new Date().toISOString() })
      .eq('id', campaign_id)

    // 6. Create PerformanceSnapshot with AI fields
    const snapshotMetrics = (snapshot as PerformanceSnapshotRow | null) ?? {
      total_impressions: 0,
      total_clicks: 0,
      total_spend: 0,
      total_conversions: 0,
      roi: 0,
      snapshot_at: new Date().toISOString(),
    }

    const { data: newSnapshot, error: snapshotError } = await client
      .from('performance_snapshots')
      .insert({
        campaign_id,
        snapshot_at: new Date().toISOString(),
        total_impressions: snapshotMetrics.total_impressions,
        total_clicks: snapshotMetrics.total_clicks,
        total_spend: snapshotMetrics.total_spend,
        total_conversions: snapshotMetrics.total_conversions,
        roi: snapshotMetrics.roi,
        ai_rating: rating,
        ai_commentary: parsed.commentary,
      })
      .select()
      .single()

    if (snapshotError) {
      console.error('Failed to insert performance snapshot:', snapshotError.message)
    }

    return jsonResponse({
      campaign_id,
      performance_rating: rating,
      ai_commentary: parsed.commentary,
      snapshot_id: newSnapshot?.id ?? null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
