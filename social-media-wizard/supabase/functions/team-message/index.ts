// Team Message — handle a new boss message.
// POST /functions/v1/team-message
// Body: { content: string, force_agents?: AgentKey[] }
//
// Flow:
//   1. Insert the boss row into team_messages.
//   2. If the boss explicitly @-mentioned agents OR force_agents is provided, use those.
//      Otherwise call the smart router (Haiku) → returns 1–2 agents.
//   3. For each chosen agent, fire agent-respond. We await all so the API caller
//      sees the replies once they land.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  AGENT_KEYS,
  agentLabel,
  checkUsageBudget,
  formatChannelHistory,
  getRecentMessages,
  isAgentKey,
  parseMentions,
  recordUsage,
} from '../_shared/agent-context.ts'
import type { AgentKey } from '../_shared/agent-context.ts'
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

async function callRouter(
  bossText: string,
  recent: { content: string; role: string; agent_key: string | null }[],
  anthropicKey: string,
): Promise<{ agents: AgentKey[]; reason: string; ms: number }> {
  const start = Date.now()
  const recentBlock = recent.slice(-10).map((m) => `[${m.role === 'boss' ? 'Boss' : agentLabel(m.agent_key as AgentKey | null)}] ${m.content.slice(0, 240)}`).join('\n')

  const prompt = `You are routing a message to the right specialist on a 3-person team.

Team:
- social_media: Social Media Expert (post/channel/creative metrics, audience reach via posts)
- cro: CRO Expert (conversion path, checkout, funnel, leading indicators)
- acquisition: Acquisition Expert (customer segments, channel efficiency, cohorts, LTV)

Recent channel:
${recentBlock || '(empty)'}

Boss just said:
${bossText}

Pick 1 or 2 agents most relevant to answer. Don't pick all three unless the question genuinely needs all three perspectives.

Respond with ONLY valid JSON, no preamble, no markdown:
{"agents":["social_media"|"cro"|"acquisition", ...],"reason":"<one short sentence>"}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Router error ${res.status}: ${await res.text()}`)
  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  const raw = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  const ms = Date.now() - start
  const match = raw.match(/\{[\s\S]*?\}/)
  let agents: AgentKey[] = []
  let reason = ''
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { agents?: string[]; reason?: string }
      const list = (parsed.agents ?? []).filter(isAgentKey).slice(0, 2)
      agents = Array.from(new Set(list))
      reason = parsed.reason ?? ''
    } catch { /* fall through */ }
  }
  if (agents.length === 0) agents = ['social_media']
  return { agents, reason, ms }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: { content?: string; force_agents?: string[] }
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  const text = (body.content ?? '').trim()
  if (!text) return jsonResponse({ error: 'content is required' }, 422)

  // Budget check up front (one boss message can dispatch 1–2 agent calls + 1 router)
  const budget = await checkUsageBudget(client)
  if (budget.daily_capped || budget.monthly_capped) {
    return jsonResponse({ error: 'Agent usage cap reached', budget }, 429)
  }

  // Insert the boss message
  const explicitMentions = parseMentions(text)
  const { data: bossRow } = await client
    .from('team_messages')
    .insert({
      role: 'boss',
      content: text,
      mentions: explicitMentions,
      triggered_by: 'boss',
      status: 'complete',
    })
    .select('id')
    .single()

  // Pick agents
  let agents: AgentKey[]
  let routerReason = ''
  const forced = (body.force_agents ?? []).filter(isAgentKey)
  if (explicitMentions.length > 0) {
    agents = explicitMentions
    routerReason = 'directed by boss @mention'
  } else if (forced.length > 0) {
    agents = forced
    routerReason = 'forced by client'
  } else {
    const anthropicKey = await getIntegrationKey(client, {
      provider: 'anthropic',
      envVars: ['ANTHROPIC_API_KEY'],
    })
    if (!anthropicKey) return jsonResponse({ error: 'Anthropic key not configured' }, 500)
    try {
      const recent = await getRecentMessages(client, 10)
      const r = await callRouter(text, recent, anthropicKey)
      agents = r.agents
      routerReason = r.reason
      await recordUsage(client, { agent_key: 'social_media', trigger: 'boss', ms: r.ms })
    } catch (err) {
      // Fall back to social media expert if the router fails
      agents = ['social_media']
      routerReason = `router failed (${err instanceof Error ? err.message : String(err)})`
    }
  }

  // Dispatch each agent. Awaited so the response includes their replies.
  // Use the anon key for the Authorization header — the receiving function's
  // gateway verifies the header is a valid JWT, and the new-format service
  // role key isn't one. Internally each function uses the service role for
  // DB access via createClient(supabaseUrl, serviceRoleKey).
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const respondUrl = `${supabaseUrl}/functions/v1/agent-respond`
  const replies = await Promise.allSettled(
    agents.map((agent_key) =>
      fetch(respondUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          agent_key,
          trigger: 'boss',
          parent_id: bossRow!.id,
          hop: 0,
          user_text: text,
        }),
      }).then((r) => r.json()),
    ),
  )

  // Detect a dispatch failure so the UI can surface it. If every agent reply
  // came back without a 'message_id', record a system-level error message in
  // the channel so the boss isn't left staring at a silent screen.
  const replyPayloads = replies.map((r) => r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  const allFailed = replyPayloads.length > 0 && replyPayloads.every((r: { message_id?: string }) => !r.message_id)
  if (allFailed) {
    const detail = JSON.stringify(replyPayloads).slice(0, 280)
    await client.from('team_messages').insert({
      role: 'system',
      content: `Agent dispatch failed — no replies came back. Detail: ${detail}`,
      parent_id: bossRow!.id,
      triggered_by: 'boss',
      status: 'error',
    })
  }

  return jsonResponse({
    boss_message_id: bossRow!.id,
    routed_to: agents,
    router_reason: routerReason,
    replies: replyPayloads,
    all_failed: allFailed,
    // Surface remaining budget for UI display
    budget: await checkUsageBudget(client),
  })
})

// Static analysis assist — not actually invoked.
void AGENT_KEYS
