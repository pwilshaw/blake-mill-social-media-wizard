// T089 — Cron: Budget Reset (Deno Edge Function)
// Triggered on a schedule (e.g. every hour via pg_cron or Supabase cron).
//
// Finds all budget_rules where period_reset_at <= now().
// Resets current_spend to 0 and advances period_reset_at to the next period.
//
// Period rules:
//   daily   → +1 day
//   weekly  → +7 days
//   monthly → +30 days
//
// Returns { reset_count } on success.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BudgetPeriod = 'daily' | 'weekly' | 'monthly'

interface BudgetRuleRow {
  id: string
  period: BudgetPeriod
  period_reset_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function advancePeriod(currentResetAt: string, period: BudgetPeriod): string {
  const d = new Date(currentResetAt)
  switch (period) {
    case 'daily':
      d.setDate(d.getDate() + 1)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7)
      break
    case 'monthly':
      d.setDate(d.getDate() + 30)
      break
  }
  return d.toISOString()
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500)
  }

  const client = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  try {
    // -----------------------------------------------------------------------
    // 1. Fetch rules due for reset
    // -----------------------------------------------------------------------
    const { data: dueRules, error: fetchError } = await client
      .from('budget_rules')
      .select('id, period, period_reset_at')
      .lte('period_reset_at', now)

    if (fetchError) {
      return jsonResponse({ error: fetchError.message }, 500)
    }

    if (!dueRules || dueRules.length === 0) {
      return jsonResponse({ reset_count: 0, message: 'No budget rules due for reset.' })
    }

    const rules = dueRules as BudgetRuleRow[]

    // -----------------------------------------------------------------------
    // 2. Reset each rule
    // -----------------------------------------------------------------------
    const results = await Promise.allSettled(
      rules.map((rule) => {
        const nextResetAt = advancePeriod(rule.period_reset_at, rule.period)
        return client
          .from('budget_rules')
          .update({
            current_spend: 0,
            period_reset_at: nextResetAt,
          })
          .eq('id', rule.id)
      }),
    )

    const failed = results.filter((r) => r.status === 'rejected')
    if (failed.length > 0) {
      console.error('[budget-reset] Some updates failed:', failed)
    }

    const resetCount = results.filter((r) => r.status === 'fulfilled').length

    return jsonResponse({
      reset_count: resetCount,
      failed_count: failed.length,
      processed_at: now,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: `Internal server error: ${message}` }, 500)
  }
})
