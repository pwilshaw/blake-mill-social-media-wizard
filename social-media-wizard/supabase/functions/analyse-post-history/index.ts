// Analyse Post History Edge Function
// POST /functions/v1/analyse-post-history
// Body: { days?: number }   // default 90
//
// Pulls channel_posts + joined content_variants for the last N days,
// computes aggregate stats per platform/day-of-week, and asks Claude for a
// narrative summary of what worked. Response includes the Claude analysis
// plus a compact stats payload the UI can render directly.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0'
import { getIntegrationKey } from '../_shared/integration-credentials.ts'

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

interface PostRow {
  id: string
  platform_post_id: string | null
  status: string
  published_at: string | null
  impressions: number
  clicks: number
  engagement_count: number
  spend: number
  content_variants: {
    platform: string
    copy_text: string
    hashtags: string[] | null
    call_to_action: string | null
    angle_label: string | null
    campaigns: { is_organic: boolean | null } | null
  } | null
}

interface PlatformAgg {
  platform: string
  posts: number
  impressions: number
  clicks: number
  engagement: number
  spend: number
  ctr: number
  engagement_rate: number
}

interface TopPost {
  id: string
  platform: string
  published_at: string | null
  impressions: number
  clicks: number
  engagement: number
  engagement_rate: number
  copy: string
  cta: string | null
}

interface OrganicPaidSplit {
  organic_posts: number
  organic_impressions: number
  organic_engagement: number
  organic_engagement_rate: number
  paid_posts: number
  paid_impressions: number
  paid_engagement: number
  paid_spend: number
  paid_engagement_rate: number
}

interface AngleAgg {
  angle: string
  posts: number
  avg_engagement_rate: number
}

interface AnalysisResponse {
  analysis: string
  days: number
  total_posts: number
  by_platform: PlatformAgg[]
  by_day_of_week: { day: string; posts: number; engagement_rate: number }[]
  organic_paid: OrganicPaidSplit
  by_angle: AngleAgg[]
  top_posts: TopPost[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

  const anthropicKey = await getIntegrationKey(client, {
    provider: 'anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
  })
  if (!anthropicKey) {
    return jsonResponse({ error: 'Anthropic API key not configured. Add one in Integrations.' }, 500)
  }

  let body: { days?: number } = {}
  try { body = await req.json() } catch { /* empty body ok */ }
  const days = Math.max(7, Math.min(365, body.days ?? 90))

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: posts, error: postsError } = await client
    .from('channel_posts')
    .select(`
      id, platform_post_id, status, published_at,
      impressions, clicks, engagement_count, spend,
      content_variants!inner (
        platform, copy_text, hashtags, call_to_action, angle_label,
        campaigns!inner ( is_organic )
      )
    `)
    .gte('published_at', since)
    .eq('status', 'published')
    .returns<PostRow[]>()

  if (postsError) return jsonResponse({ error: postsError.message }, 500)
  const rows: PostRow[] = posts ?? []

  if (rows.length === 0) {
    return jsonResponse<AnalysisResponse>({
      analysis: "No published posts in the selected window. Once you've published a few posts (or backfilled older ones from your connected platforms) there'll be something to analyse.",
      days,
      total_posts: 0,
      by_platform: [],
      by_day_of_week: [],
      organic_paid: {
        organic_posts: 0, organic_impressions: 0, organic_engagement: 0, organic_engagement_rate: 0,
        paid_posts: 0, paid_impressions: 0, paid_engagement: 0, paid_spend: 0, paid_engagement_rate: 0,
      },
      by_angle: [],
      top_posts: [],
    })
  }

  // Aggregate by platform
  const platformMap = new Map<string, PlatformAgg>()
  for (const p of rows) {
    const platform = p.content_variants?.platform ?? 'unknown'
    const agg = platformMap.get(platform) ?? {
      platform, posts: 0, impressions: 0, clicks: 0, engagement: 0, spend: 0, ctr: 0, engagement_rate: 0,
    }
    agg.posts += 1
    agg.impressions += p.impressions
    agg.clicks += p.clicks
    agg.engagement += p.engagement_count
    agg.spend += p.spend
    platformMap.set(platform, agg)
  }
  const by_platform: PlatformAgg[] = Array.from(platformMap.values()).map((a) => ({
    ...a,
    ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
    engagement_rate: a.impressions > 0 ? (a.engagement / a.impressions) * 100 : 0,
  })).sort((a, b) => b.impressions - a.impressions)

  // Aggregate by day-of-week
  const dowCounts = DAY_NAMES.map((d) => ({ day: d, posts: 0, impressions: 0, engagement: 0 }))
  for (const p of rows) {
    if (!p.published_at) continue
    const dow = new Date(p.published_at).getUTCDay()
    dowCounts[dow].posts += 1
    dowCounts[dow].impressions += p.impressions
    dowCounts[dow].engagement += p.engagement_count
  }
  const by_day_of_week = dowCounts.map((d) => ({
    day: d.day,
    posts: d.posts,
    engagement_rate: d.impressions > 0 ? (d.engagement / d.impressions) * 100 : 0,
  }))

  // Top 5 posts by engagement rate (min 100 impressions to avoid noise)
  const top_posts: TopPost[] = rows
    .filter((p) => p.impressions >= 100)
    .map((p): TopPost => ({
      id: p.id,
      platform: p.content_variants?.platform ?? 'unknown',
      published_at: p.published_at,
      impressions: p.impressions,
      clicks: p.clicks,
      engagement: p.engagement_count,
      engagement_rate: (p.engagement_count / p.impressions) * 100,
      copy: p.content_variants?.copy_text ?? '',
      cta: p.content_variants?.call_to_action ?? null,
    }))
    .sort((a, b) => b.engagement_rate - a.engagement_rate)
    .slice(0, 5)

  // Organic vs paid split
  const organic_paid: OrganicPaidSplit = {
    organic_posts: 0, organic_impressions: 0, organic_engagement: 0, organic_engagement_rate: 0,
    paid_posts: 0, paid_impressions: 0, paid_engagement: 0, paid_spend: 0, paid_engagement_rate: 0,
  }
  for (const p of rows) {
    const isOrganic = Boolean(p.content_variants?.campaigns?.is_organic)
    if (isOrganic) {
      organic_paid.organic_posts += 1
      organic_paid.organic_impressions += p.impressions
      organic_paid.organic_engagement += p.engagement_count
    } else {
      organic_paid.paid_posts += 1
      organic_paid.paid_impressions += p.impressions
      organic_paid.paid_engagement += p.engagement_count
      organic_paid.paid_spend += p.spend
    }
  }
  organic_paid.organic_engagement_rate = organic_paid.organic_impressions > 0
    ? (organic_paid.organic_engagement / organic_paid.organic_impressions) * 100
    : 0
  organic_paid.paid_engagement_rate = organic_paid.paid_impressions > 0
    ? (organic_paid.paid_engagement / organic_paid.paid_impressions) * 100
    : 0

  // Creative variety: by angle_label
  const angleMap = new Map<string, { posts: number; totalRate: number }>()
  for (const p of rows) {
    const angle = p.content_variants?.angle_label ?? 'unlabelled'
    const rate = p.impressions > 0 ? (p.engagement_count / p.impressions) * 100 : 0
    const agg = angleMap.get(angle) ?? { posts: 0, totalRate: 0 }
    agg.posts += 1
    agg.totalRate += rate
    angleMap.set(angle, agg)
  }
  const by_angle: AngleAgg[] = Array.from(angleMap.entries())
    .map(([angle, a]) => ({
      angle,
      posts: a.posts,
      avg_engagement_rate: a.posts > 0 ? a.totalRate / a.posts : 0,
    }))
    .sort((a, b) => b.avg_engagement_rate - a.avg_engagement_rate)

  // Detect CTA repetition (creative-variety signal)
  const ctaMap = new Map<string, number>()
  for (const p of top_posts) {
    if (p.cta) ctaMap.set(p.cta, (ctaMap.get(p.cta) ?? 0) + 1)
  }
  const topCtas = Array.from(ctaMap.entries()).sort((a, b) => b[1] - a[1])

  // Build compact prompt for Claude
  const summary = {
    window_days: days,
    total_posts: rows.length,
    by_platform: by_platform.map((p) => ({
      platform: p.platform,
      posts: p.posts,
      impressions: p.impressions,
      clicks: p.clicks,
      engagement: p.engagement,
      spend_gbp: Number(p.spend.toFixed(2)),
      ctr_pct: Number(p.ctr.toFixed(2)),
      engagement_rate_pct: Number(p.engagement_rate.toFixed(2)),
    })),
    by_day_of_week: by_day_of_week.map((d) => ({
      day: d.day,
      posts: d.posts,
      engagement_rate_pct: Number(d.engagement_rate.toFixed(2)),
    })),
    organic_vs_paid: {
      organic: {
        posts: organic_paid.organic_posts,
        impressions: organic_paid.organic_impressions,
        engagement_rate_pct: Number(organic_paid.organic_engagement_rate.toFixed(2)),
      },
      paid: {
        posts: organic_paid.paid_posts,
        impressions: organic_paid.paid_impressions,
        spend_gbp: Number(organic_paid.paid_spend.toFixed(2)),
        engagement_rate_pct: Number(organic_paid.paid_engagement_rate.toFixed(2)),
      },
    },
    by_angle: by_angle.map((a) => ({
      angle: a.angle,
      posts: a.posts,
      avg_engagement_rate_pct: Number(a.avg_engagement_rate.toFixed(2)),
    })),
    top_posts: top_posts.map((t) => ({
      platform: t.platform,
      published_at: t.published_at,
      impressions: t.impressions,
      engagement_rate_pct: Number(t.engagement_rate.toFixed(2)),
      copy_preview: t.copy.slice(0, 180),
      cta: t.cta,
    })),
    top_ctas: topCtas,
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  let analysis = ''
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      messages: [{
        role: 'user',
        content: `You are analysing social media post performance for Blake Mill, an independent UK men's shirt brand.

Blake Mill's philosophy: humans create, tech amplifies. Volume + variety of creative matters. Organic and paid support each other; neither should carry the brand alone.

Write three short paragraphs (no bullets, no headings, reference the actual numbers):

1. **What worked and a creative-variety observation.** Name the winning angle (or flag if the top posts all share the same angle/CTA — repetition is a weak signal). Call out the concrete repetition if it exists (e.g. "4 of the top 5 posts use the same CTA — try varying it") or concrete diversity if it's working. Reference specific engagement-rate percentages.

2. **Organic vs paid mix.** Compare the two. Is paid spend disproportionately carrying impressions? Is organic carrying its weight on engagement rate? Call out if the mix is skewed. If there are zero paid or zero organic posts, say so plainly.

3. **One concrete recommendation for the next campaign.** Must be actionable and reflect both (1) and (2) — e.g. which platform to lean into, which angle to try more of, whether to shift organic/paid balance. Don't give multi-part recommendations.

Hard rules: don't over-claim if data is thin (<20 posts or <2 weeks) — say so. No bullets. No markdown headings. Specific numbers over vague adjectives.

Stats:
${JSON.stringify(summary, null, 2)}`,
      }],
    })
    const first = msg.content[0]
    analysis = first.type === 'text' ? first.text : 'Analysis unavailable.'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    analysis = `Claude call failed: ${message}`
  }

  const response: AnalysisResponse = {
    analysis,
    days,
    total_posts: rows.length,
    by_platform,
    by_day_of_week,
    organic_paid,
    by_angle,
    top_posts,
  }

  return jsonResponse(response)
})
