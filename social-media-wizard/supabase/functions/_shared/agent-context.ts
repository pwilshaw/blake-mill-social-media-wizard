// Shared helpers for the agent workforce edge functions.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type AgentKey = 'social_media' | 'cro' | 'acquisition'
export const AGENT_KEYS: readonly AgentKey[] = ['social_media', 'cro', 'acquisition']

// Daily / monthly cap on combined Claude calls across the team.
export const DAILY_AGENT_CAP = 100
export const MONTHLY_AGENT_CAP = 1500

export const HOP_LIMIT = 2

export interface UsageBudget {
  daily_count: number
  monthly_count: number
  daily_remaining: number
  monthly_remaining: number
  daily_capped: boolean
  monthly_capped: boolean
}

export async function checkUsageBudget(client: SupabaseClient): Promise<UsageBudget> {
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [{ count: daily }, { count: monthly }] = await Promise.all([
    client
      .from('agent_usage')
      .select('id', { count: 'exact', head: true })
      .gte('used_at', dayStart.toISOString()),
    client
      .from('agent_usage')
      .select('id', { count: 'exact', head: true })
      .gte('used_at', monthStart.toISOString()),
  ])
  const dCount = daily ?? 0
  const mCount = monthly ?? 0
  return {
    daily_count: dCount,
    monthly_count: mCount,
    daily_remaining: Math.max(0, DAILY_AGENT_CAP - dCount),
    monthly_remaining: Math.max(0, MONTHLY_AGENT_CAP - mCount),
    daily_capped: dCount >= DAILY_AGENT_CAP,
    monthly_capped: mCount >= MONTHLY_AGENT_CAP,
  }
}

export async function recordUsage(
  client: SupabaseClient,
  args: {
    agent_key: AgentKey | 'router'
    trigger: 'boss' | 'agent' | 'schedule' | 'manual_template'
    template_key?: string | null
    ms?: number
    estimated_cost_usd?: number
  },
): Promise<void> {
  await client.from('agent_usage').insert({
    agent_key: args.agent_key,
    trigger: args.trigger,
    template_key: args.template_key ?? null,
    ms: args.ms ?? null,
    estimated_cost_usd: args.estimated_cost_usd ?? null,
  })
}

export interface TeamMessageRow {
  id: string
  role: 'boss' | 'agent' | 'system'
  agent_key: AgentKey | null
  content: string
  template_key: string | null
  hop: number
  parent_id: string | null
  mentions: string[]
  created_at: string
}

export async function getRecentMessages(
  client: SupabaseClient,
  limit = 30,
): Promise<TeamMessageRow[]> {
  const { data } = await client
    .from('team_messages')
    .select('id, role, agent_key, content, template_key, hop, parent_id, mentions, created_at')
    .eq('status', 'complete')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<TeamMessageRow[]>()
  return (data ?? []).reverse()
}

const MENTION_RX = /@(social|cro|acquisition)\b/gi

export function parseMentions(text: string): AgentKey[] {
  const matches = text.match(MENTION_RX) ?? []
  const out = new Set<AgentKey>()
  for (const m of matches) {
    const lower = m.toLowerCase().slice(1)
    if (lower === 'social') out.add('social_media')
    else if (lower === 'cro') out.add('cro')
    else if (lower === 'acquisition') out.add('acquisition')
  }
  return Array.from(out)
}

export function formatChannelHistory(messages: TeamMessageRow[]): string {
  if (messages.length === 0) return '(no prior team messages)'
  return messages
    .map((m) => {
      const who = m.role === 'boss' ? 'Boss' : m.role === 'system' ? 'System' : agentLabel(m.agent_key)
      return `[${who}] ${m.content}`
    })
    .join('\n\n')
}

export function agentLabel(key: AgentKey | null): string {
  switch (key) {
    case 'social_media': return 'Social Media Expert'
    case 'cro': return 'CRO Expert'
    case 'acquisition': return 'Acquisition Expert'
    default: return 'Unknown'
  }
}

export function isAgentKey(s: string): s is AgentKey {
  return s === 'social_media' || s === 'cro' || s === 'acquisition'
}
