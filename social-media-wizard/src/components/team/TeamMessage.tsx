import { useQuery } from '@tanstack/react-query'
import { Loader2, Megaphone, Activity, ShoppingBag, Bot, AlertCircle } from 'lucide-react'
import { listAgentSettings } from '@/lib/agents/api'
import type { TeamMessage as TeamMessageT, AgentKey } from '@/lib/types'

const AGENT_META: Record<AgentKey, { label: string; initial: string; color: string }> = {
  social_media: { label: 'Social Media Expert', initial: 'S', color: 'bg-rose-500 text-white' },
  cro: { label: 'CRO Expert', initial: 'C', color: 'bg-emerald-500 text-white' },
  acquisition: { label: 'Acquisition Expert', initial: 'A', color: 'bg-indigo-500 text-white' },
}

const TRIGGER_LABEL: Record<string, string> = {
  boss: 'replied to you',
  agent: 'cross-tagged in',
  schedule: 'scheduled briefing',
  manual_template: 'ran a template',
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function highlightMentions(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /(@(?:social|cro|acquisition))\b/gi
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <span key={i++} className="rounded bg-primary/10 px-1 py-0.5 text-xs font-semibold text-primary">
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function TeamMessage({ message }: { message: TeamMessageT }) {
  const isBoss = message.role === 'boss'
  const isSystem = message.role === 'system'
  const isPending = message.status === 'pending'
  const isError = message.status === 'error'
  const indented = message.hop > 0 && !isBoss

  // Look up the agent's custom avatar (if any). Cached across the page via
  // the same query key the rail uses, so this is essentially free.
  const settingsQuery = useQuery({
    queryKey: ['agent_settings'],
    queryFn: listAgentSettings,
    staleTime: 5 * 60 * 1000,
    enabled: !isBoss && !isSystem,
  })
  const agentAvatar = message.agent_key
    ? (settingsQuery.data ?? []).find((s) => s.agent_key === message.agent_key)?.avatar_url ?? null
    : null

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3 bg-muted/30 rounded-md">
        <Activity className="h-3.5 w-3.5" />
        <span>{message.content}</span>
        <span className="ml-auto">{timeAgo(message.created_at)}</span>
      </div>
    )
  }

  const agentMeta = message.agent_key ? AGENT_META[message.agent_key] : null
  const avatarLabel = isBoss ? 'B' : agentMeta?.initial ?? '?'
  const avatarColor = isBoss
    ? 'bg-foreground text-background'
    : agentMeta?.color ?? 'bg-muted text-foreground'
  const headerLabel = isBoss ? 'Boss' : agentMeta?.label ?? 'Agent'
  const triggerNote = !isBoss && message.triggered_by !== 'boss'
    ? TRIGGER_LABEL[message.triggered_by] ?? message.triggered_by
    : null

  return (
    <div className={`flex gap-3 ${indented ? 'ml-10' : ''}`} data-hop={message.hop}>
      {agentAvatar && !isBoss ? (
        <img
          src={agentAvatar}
          alt={agentMeta?.label ?? 'Agent avatar'}
          className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-border"
        />
      ) : (
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-semibold text-sm ${avatarColor}`}>
          {isBoss ? <Megaphone className="h-4 w-4" /> : avatarLabel}
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-foreground">{headerLabel}</span>
          {triggerNote && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {triggerNote}
            </span>
          )}
          {message.template_key && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
              {message.template_key}
            </span>
          )}
          <span className="text-muted-foreground">· {timeAgo(message.created_at)}</span>
        </div>
        {isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking…
          </div>
        ) : isError ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>{message.error ?? 'Reply failed.'}</span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {highlightMentions(message.content)}
          </p>
        )}
      </div>
    </div>
  )
}

export function AgentAvatar({ agent_key }: { agent_key: AgentKey }) {
  const meta = AGENT_META[agent_key]
  return (
    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${meta.color}`}>
      {meta.initial}
    </div>
  )
}

export const AGENT_DISPLAY = AGENT_META

export function agentIcon(agent_key: AgentKey | null) {
  switch (agent_key) {
    case 'social_media': return <Bot className="h-4 w-4" />
    case 'cro': return <Activity className="h-4 w-4" />
    case 'acquisition': return <ShoppingBag className="h-4 w-4" />
    default: return null
  }
}
