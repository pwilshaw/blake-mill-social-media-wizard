// Cron Agent Dispatcher — fires templates whose cron_expr is due.
// Scheduled via pg_cron every 5 minutes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isDue } from '../_shared/cron-due.ts'
import { checkUsageBudget } from '../_shared/agent-context.ts'

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const now = new Date()

  // Cap check first — if we're over the day's cap, post a single system note
  // to the channel and skip all dispatches.
  const budget = await checkUsageBudget(client)
  if (budget.daily_capped) {
    // Only post a skip note if we haven't already today
    const dayStart = new Date()
    dayStart.setUTCHours(0, 0, 0, 0)
    const { data: existing } = await client
      .from('team_messages')
      .select('id')
      .eq('role', 'system')
      .like('content', '%daily agent cap reached%')
      .gte('created_at', dayStart.toISOString())
      .limit(1)
      .maybeSingle()
    if (!existing) {
      await client.from('team_messages').insert({
        role: 'system',
        content: `Daily agent cap reached (${budget.daily_count} runs). Scheduled briefings will resume tomorrow. Boss can still post directly.`,
        triggered_by: 'schedule',
        status: 'complete',
      })
    }
    return jsonResponse({ skipped: true, reason: 'daily cap reached' })
  }

  const { data: templates } = await client
    .from('agent_templates')
    .select('id, agent_key, template_key, name, cron_expr, last_run_at, is_active')
    .eq('is_active', true)
    .not('cron_expr', 'is', null)

  const due = (templates ?? []).filter((t) => t.cron_expr && isDue(t.cron_expr, t.last_run_at, now))

  // Dispatch sequentially to avoid hammering the cap on a single tick
  const fired: { id: string; name: string }[] = []
  const respondUrl = `${supabaseUrl}/functions/v1/agent-respond`
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  for (const t of due) {
    // Re-check budget per template — we may cross the line mid-loop
    const b = await checkUsageBudget(client)
    if (b.daily_capped) break
    try {
      await fetch(respondUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          agent_key: t.agent_key,
          trigger: 'schedule',
          template_id: t.id,
        }),
      })
      fired.push({ id: t.id, name: t.name })
    } catch {
      /* swallow — next tick will retry */
    }
  }

  return jsonResponse({ checked: templates?.length ?? 0, fired })
})
