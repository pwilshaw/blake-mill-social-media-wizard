// Agent Respond — single agent reply.
// POST /functions/v1/agent-respond
// Body: {
//   agent_key: 'social_media' | 'cro' | 'acquisition',
//   trigger: 'boss' | 'agent' | 'schedule' | 'manual_template',
//   template_id?: string,           // if running a template
//   parent_id?: string,             // if replying in a thread
//   hop?: number,                   // hop count for cross-agent follow-ups
//   user_text?: string,             // boss text being responded to (boss/agent triggers)
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  AGENT_KEYS,
  HOP_LIMIT,
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
import { getAgentDataSlice } from '../_shared/agent-data.ts'
import { getBrandKnowledge, formatBrandSection } from '../_shared/brand-knowledge.ts'

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

interface Body {
  agent_key: AgentKey
  trigger: 'boss' | 'agent' | 'schedule' | 'manual_template'
  template_id?: string
  parent_id?: string
  hop?: number
  user_text?: string
}

async function callClaudeText(
  prompt: string,
  systemPrompt: string,
  anthropicKey: string,
  model = 'claude-sonnet-4-6',
): Promise<{ text: string; ms: number }> {
  const start = Date.now()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude error ${res.status}: ${errText}`)
  }
  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()
  return { text, ms: Date.now() - start }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: Body
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!isAgentKey(body.agent_key)) return jsonResponse({ error: 'agent_key invalid' }, 422)

  // Budget check
  const budget = await checkUsageBudget(client)
  if (budget.daily_capped || budget.monthly_capped) {
    return jsonResponse({ error: 'Agent usage cap reached', budget }, 429)
  }

  // Anthropic key
  const anthropicKey = await getIntegrationKey(client, {
    provider: 'anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
  })
  if (!anthropicKey) return jsonResponse({ error: 'Anthropic key not configured' }, 500)

  // Load agent settings
  const { data: settings } = await client
    .from('agent_settings')
    .select('agent_key, display_name, system_prompt, custom_rules')
    .eq('agent_key', body.agent_key)
    .single()
  if (!settings) return jsonResponse({ error: 'Agent settings not found' }, 404)

  // Load template if provided
  let templateRow: { id: string; template_key: string; name: string; prompt_template: string; custom_rules: string | null } | null = null
  if (body.template_id) {
    const { data: tpl } = await client
      .from('agent_templates')
      .select('id, template_key, name, prompt_template, custom_rules')
      .eq('id', body.template_id)
      .single()
    if (tpl) templateRow = tpl
  }

  // Recent channel history + data slice + brand voice
  const [recent, slice, brand] = await Promise.all([
    getRecentMessages(client, 30),
    getAgentDataSlice(client, body.agent_key),
    getBrandKnowledge(client),
  ])
  const brandSection = formatBrandSection(brand)

  const userMessageBlock = body.user_text
    ? `## Latest message from the Boss\n${body.user_text}`
    : '## No specific message — proactive briefing'

  const templateBlock = templateRow
    ? `## Template focus: ${templateRow.name}\n${templateRow.prompt_template}${templateRow.custom_rules ? `\n\nCustom rules: ${templateRow.custom_rules}` : ''}`
    : ''

  const customRulesBlock = settings.custom_rules
    ? `## Custom rules for this agent\n${settings.custom_rules}`
    : ''

  const dataBlock = `## Your data slice (window: ${slice.window_days} days, quality: ${slice.data_quality})\n${JSON.stringify(slice.summary, null, 2)}`

  const historyBlock = `## Recent team channel\n${formatChannelHistory(recent)}`

  const guardrails = `## Reply rules
- Reply in 2–3 short paragraphs. No bullet lists. No headings.
- Reference specific numbers from the data slice.
- If data is thin, say so plainly.
- You may end your reply with @cro, @social, or @acquisition to invite a teammate, but only if there is a real reason. Do not use mentions every reply.
- Do not @ yourself.`

  const prompt = [brandSection, historyBlock, userMessageBlock, templateBlock, customRulesBlock, dataBlock, guardrails]
    .filter(Boolean)
    .join('\n\n')

  // Insert pending row so the UI sees the agent thinking
  const hop = body.hop ?? 0
  const { data: pendingRow } = await client
    .from('team_messages')
    .insert({
      role: 'agent',
      agent_key: body.agent_key,
      content: '',
      parent_id: body.parent_id ?? null,
      template_key: templateRow?.template_key ?? null,
      triggered_by: body.trigger,
      hop,
      status: 'pending',
    })
    .select('id')
    .single()

  try {
    const { text, ms } = await callClaudeText(prompt, settings.system_prompt, anthropicKey)

    // Strip self-mentions defensively
    const selfMention = body.agent_key === 'social_media' ? /@social\b/gi
      : body.agent_key === 'cro' ? /@cro\b/gi
      : /@acquisition\b/gi
    const cleanText = text.replace(selfMention, '')

    const mentions = parseMentions(cleanText).filter((m) => m !== body.agent_key)

    await client
      .from('team_messages')
      .update({
        content: cleanText,
        mentions,
        status: 'complete',
        ms,
      })
      .eq('id', pendingRow!.id)

    if (templateRow) {
      await client
        .from('agent_templates')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', templateRow.id)
    }

    await recordUsage(client, {
      agent_key: body.agent_key,
      trigger: body.trigger,
      template_key: templateRow?.template_key ?? null,
      ms,
    })

    // Cross-agent follow-ups: at most 1 hop deeper, only for new agents
    let followUpFired: AgentKey[] = []
    if (mentions.length > 0 && hop < HOP_LIMIT) {
      const dispatcherUrl = `${supabaseUrl}/functions/v1/agent-respond`
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const seen = new Set<AgentKey>([body.agent_key])
      for (const m of mentions) {
        if (seen.has(m)) continue
        seen.add(m)
        if (!AGENT_KEYS.includes(m)) continue
        followUpFired.push(m)
        // Fire-and-forget: kick the next hop without awaiting
        fetch(dispatcherUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            agent_key: m,
            trigger: 'agent',
            parent_id: pendingRow!.id,
            hop: hop + 1,
            user_text: `${agentLabel(body.agent_key)} mentioned you in a reply. Their reply: "${cleanText.slice(0, 800)}". Add your perspective in 2 short paragraphs.`,
          }),
        }).catch(() => { /* swallowed */ })
      }
    }

    return jsonResponse({
      message_id: pendingRow!.id,
      content: cleanText,
      mentions,
      follow_ups_fired: followUpFired,
      ms,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await client
      .from('team_messages')
      .update({ status: 'error', error: message })
      .eq('id', pendingRow!.id)
    return jsonResponse({ error: message }, 500)
  }
})
