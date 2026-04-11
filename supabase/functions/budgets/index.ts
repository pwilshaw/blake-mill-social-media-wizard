// T064 — Budgets Edge Function
// GET    /budgets                                   — list budget rules
// POST   /budgets                                   — create budget rule
// PATCH  /budgets?id=<uuid>                         — update budget rule
// GET    /budgets/spend-log?period=&channel=&campaign= — filtered spend log

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const pathSuffix = url.pathname
    .replace(/^\/functions\/v1\/budgets/, '')
    .replace(/^\//, '')
  const subPath = pathSuffix ? `/${pathSuffix}` : '/'

  const id = url.searchParams.get('id')

  try {
    // -------------------------------------------------------------------
    // GET /spend-log  — filtered spend log entries
    // -------------------------------------------------------------------
    if (req.method === 'GET' && subPath === '/spend-log') {
      const period = url.searchParams.get('period') // e.g. "2025-04"
      const channel = url.searchParams.get('channel')
      const campaign = url.searchParams.get('campaign')

      let query = client
        .from('spend_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(500)

      if (channel) query = query.eq('channel_account_id', channel)
      if (campaign) query = query.eq('campaign_id', campaign)

      if (period) {
        // period is a YYYY-MM string — filter to that calendar month
        const start = `${period}-01T00:00:00.000Z`
        const [year, month] = period.split('-').map(Number)
        const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
        const end = `${nextMonth}-01T00:00:00.000Z`
        query = query.gte('logged_at', start).lt('logged_at', end)
      }

      const { data, error } = await query
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -------------------------------------------------------------------
    // GET /  — list budget rules
    // -------------------------------------------------------------------
    if (req.method === 'GET' && subPath === '/') {
      const { data, error } = await client
        .from('budget_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -------------------------------------------------------------------
    // POST /  — create budget rule
    // -------------------------------------------------------------------
    if (req.method === 'POST' && subPath === '/') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      const { scope, period, limit_amount, alert_threshold_pct, auto_pause, channel_account_id, campaign_id } = body

      if (!scope || !period || limit_amount === undefined) {
        return jsonResponse({ error: 'scope, period, and limit_amount are required' }, 422)
      }

      const { data, error } = await client
        .from('budget_rules')
        .insert({
          scope,
          period,
          limit_amount,
          alert_threshold_pct: alert_threshold_pct ?? 80,
          auto_pause: auto_pause ?? false,
          channel_account_id: channel_account_id ?? null,
          campaign_id: campaign_id ?? null,
          current_spend: 0,
          period_reset_at: computeNextReset(period as string),
        })
        .select()
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data, 201)
    }

    // -------------------------------------------------------------------
    // PATCH /?id=<uuid>  — update budget rule
    // -------------------------------------------------------------------
    if (req.method === 'PATCH') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      // Strip protected fields
      const { id: _id, current_spend: _cs, period_reset_at: _pra, created_at: _ca, ...fields } = body

      const { data, error } = await client
        .from('budget_rules')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const httpStatus = error.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: error.message }, httpStatus)
      }

      return jsonResponse(data)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeNextReset(period: string): string {
  const now = new Date()
  if (period === 'daily') {
    now.setUTCDate(now.getUTCDate() + 1)
    now.setUTCHours(0, 0, 0, 0)
    return now.toISOString()
  }
  if (period === 'weekly') {
    const dayOfWeek = now.getUTCDay() // 0 = Sunday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    now.setUTCDate(now.getUTCDate() + daysUntilMonday)
    now.setUTCHours(0, 0, 0, 0)
    return now.toISOString()
  }
  // monthly — first of next month
  now.setUTCMonth(now.getUTCMonth() + 1, 1)
  now.setUTCHours(0, 0, 0, 0)
  return now.toISOString()
}
