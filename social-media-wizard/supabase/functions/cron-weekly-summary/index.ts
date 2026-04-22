// T091 — Cron: Weekly Summary (Deno Edge Function)
// Triggered once per week (e.g. Monday 08:00 via Supabase cron).
//
// 1. Aggregates all campaign performance_snapshots for the past 7 days.
// 2. Sends aggregated data to Claude API for an AI-written summary.
// 3. Creates a PerformanceSnapshot row with ai_commentary = weekly summary.
//    campaign_id is set to null (or a sentinel) to represent a cross-campaign snapshot.
// 4. Returns { snapshot_id, ai_commentary }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0'
import { getIntegrationKey } from '../_shared/integration-credentials.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PerformanceRow {
  campaign_id: string
  total_impressions: number
  total_clicks: number
  total_spend: number
  total_conversions: number
  roi: number
}

interface AggregatedMetrics {
  total_impressions: number
  total_clicks: number
  total_spend: number
  total_conversions: number
  avg_roi: number
  campaign_count: number
  period_start: string
  period_end: string
}

interface WeeklySummarySnapshot {
  campaign_id: string | null
  snapshot_at: string
  total_impressions: number
  total_clicks: number
  total_spend: number
  total_conversions: number
  roi: number
  ai_rating: number | null
  ai_commentary: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function aggregateSnapshots(rows: PerformanceRow[]): AggregatedMetrics {
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd)
  periodStart.setDate(periodStart.getDate() - 7)

  const campaignIds = new Set(rows.map((r) => r.campaign_id))

  const totals = rows.reduce(
    (acc, row) => ({
      total_impressions: acc.total_impressions + row.total_impressions,
      total_clicks: acc.total_clicks + row.total_clicks,
      total_spend: acc.total_spend + row.total_spend,
      total_conversions: acc.total_conversions + row.total_conversions,
      roi_sum: acc.roi_sum + row.roi,
    }),
    { total_impressions: 0, total_clicks: 0, total_spend: 0, total_conversions: 0, roi_sum: 0 },
  )

  return {
    total_impressions: totals.total_impressions,
    total_clicks: totals.total_clicks,
    total_spend: totals.total_spend,
    total_conversions: totals.total_conversions,
    avg_roi: rows.length > 0 ? totals.roi_sum / rows.length : 0,
    campaign_count: campaignIds.size,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  }
}

function buildClaudePrompt(metrics: AggregatedMetrics): string {
  const ctr =
    metrics.total_impressions > 0
      ? ((metrics.total_clicks / metrics.total_impressions) * 100).toFixed(2)
      : '0.00'

  const convRate =
    metrics.total_clicks > 0
      ? ((metrics.total_conversions / metrics.total_clicks) * 100).toFixed(2)
      : '0.00'

  return `You are a social media marketing analyst for Blake Mill, a premium British shirt brand.

Write a concise weekly performance summary (3–5 sentences) for the marketing team based on the following 7-day campaign data:

- Period: ${metrics.period_start.split('T')[0]} to ${metrics.period_end.split('T')[0]}
- Active campaigns: ${metrics.campaign_count}
- Total impressions: ${metrics.total_impressions.toLocaleString()}
- Total clicks: ${metrics.total_clicks.toLocaleString()}
- Click-through rate: ${ctr}%
- Total spend: £${metrics.total_spend.toFixed(2)}
- Total conversions: ${metrics.total_conversions}
- Conversion rate: ${convRate}%
- Average ROI: ${metrics.avg_roi.toFixed(2)}x

Highlight the most important trend, any concern worth addressing, and one actionable recommendation. Be specific and direct. Do not use bullet points — write in paragraph form.`
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: 'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY' },
      500,
    )
  }

  const client = createClient(supabaseUrl, serviceRoleKey)

  const anthropicApiKey = await getIntegrationKey(client, {
    provider: 'anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
  })
  if (!anthropicApiKey) {
    return jsonResponse({ error: 'Anthropic API key not configured. Add one in Integrations.' }, 500)
  }
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  try {
    // -----------------------------------------------------------------------
    // 1. Aggregate performance snapshots for past 7 days
    // -----------------------------------------------------------------------
    const { data: snapshots, error: fetchError } = await client
      .from('performance_snapshots')
      .select('campaign_id, total_impressions, total_clicks, total_spend, total_conversions, roi')
      .gte('snapshot_at', sevenDaysAgo.toISOString())
      .lte('snapshot_at', now.toISOString())

    if (fetchError) {
      return jsonResponse({ error: `Failed to fetch snapshots: ${fetchError.message}` }, 500)
    }

    const rows = (snapshots ?? []) as PerformanceRow[]
    const metrics = aggregateSnapshots(rows)

    if (rows.length === 0) {
      return jsonResponse({
        snapshot_id: null,
        ai_commentary: 'No campaign data available for the past 7 days.',
        metrics,
      })
    }

    // -----------------------------------------------------------------------
    // 2. Generate AI summary via Claude
    // -----------------------------------------------------------------------
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })
    const prompt = buildClaudePrompt(metrics)

    const aiResponse = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const firstContent = aiResponse.content[0]
    const aiCommentary =
      firstContent.type === 'text'
        ? firstContent.text.trim()
        : 'Weekly summary unavailable — unexpected AI response format.'

    // -----------------------------------------------------------------------
    // 3. Create weekly PerformanceSnapshot
    // -----------------------------------------------------------------------
    const snapshotRow: WeeklySummarySnapshot = {
      campaign_id: null,
      snapshot_at: now.toISOString(),
      total_impressions: metrics.total_impressions,
      total_clicks: metrics.total_clicks,
      total_spend: metrics.total_spend,
      total_conversions: metrics.total_conversions,
      roi: metrics.avg_roi,
      ai_rating: null,
      ai_commentary: aiCommentary,
    }

    const { data: inserted, error: insertError } = await client
      .from('performance_snapshots')
      .insert(snapshotRow)
      .select('id')
      .single()

    if (insertError) {
      // Return the summary even if persistence fails
      console.error('[weekly-summary] Failed to insert snapshot:', insertError.message)
      return jsonResponse({
        snapshot_id: null,
        ai_commentary: aiCommentary,
        metrics,
        warning: `Snapshot not persisted: ${insertError.message}`,
      })
    }

    return jsonResponse({
      snapshot_id: (inserted as { id: string }).id,
      ai_commentary: aiCommentary,
      metrics,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: `Internal server error: ${message}` }, 500)
  }
})
