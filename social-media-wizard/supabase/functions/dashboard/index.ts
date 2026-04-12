// T022 — Dashboard Edge Function
// Aggregates performance_snapshots and spend_logs for a given period.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

type Period = 'today' | '7d' | '30d'

function periodToStartDate(period: Period): string {
  const now = new Date()
  if (period === 'today') {
    now.setHours(0, 0, 0, 0)
    return now.toISOString()
  }
  const days = period === '7d' ? 7 : 30
  now.setDate(now.getDate() - days)
  return now.toISOString()
}

function isValidPeriod(value: string | null): value is Period {
  return value === 'today' || value === '7d' || value === '30d'
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  const url = new URL(req.url)
  const rawPeriod = url.searchParams.get('period')
  const period: Period = isValidPeriod(rawPeriod) ? rawPeriod : '7d'
  const startDate = periodToStartDate(period)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Fetch performance snapshots for the period
    const { data: snapshots, error: snapshotsError } = await client
      .from('performance_snapshots')
      .select('campaign_id, total_impressions, total_clicks, total_spend, total_conversions, roi')
      .gte('snapshot_at', startDate)

    if (snapshotsError) throw snapshotsError

    // Fetch spend logs for the period (for accurate spend aggregation)
    const { data: spendLogs, error: spendError } = await client
      .from('spend_logs')
      .select('amount')
      .gte('logged_at', startDate)

    if (spendError) throw spendError

    const rows = snapshots ?? []
    const logs = spendLogs ?? []

    const totalImpressions = rows.reduce(
      (sum: number, s: { total_impressions: number }) => sum + (s.total_impressions ?? 0),
      0,
    )
    const totalClicks = rows.reduce(
      (sum: number, s: { total_clicks: number }) => sum + (s.total_clicks ?? 0),
      0,
    )
    const totalConversions = rows.reduce(
      (sum: number, s: { total_conversions: number }) => sum + (s.total_conversions ?? 0),
      0,
    )
    const avgRoi =
      rows.length > 0
        ? rows.reduce((sum: number, s: { roi: number }) => sum + (s.roi ?? 0), 0) / rows.length
        : 0

    // Use spend_logs as the authoritative spend total
    const totalSpend = logs.reduce(
      (sum: number, l: { amount: number }) => sum + (l.amount ?? 0),
      0,
    )

    const activeCampaignIds = new Set(rows.map((s: { campaign_id: string }) => s.campaign_id))

    const metrics = {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: parseFloat(totalSpend.toFixed(2)),
      conversions: totalConversions,
      roi: parseFloat(avgRoi.toFixed(2)),
      campaigns_active: activeCampaignIds.size,
      period,
    }

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
