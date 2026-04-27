import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Users2 } from 'lucide-react'
import {
  listMessages,
  listAgentSettings,
  listTemplates,
  postBossMessage,
  subscribeToMessages,
} from '@/lib/agents/api'
import { TeamMessage } from '@/components/team/TeamMessage'
import { AgentRail } from '@/components/team/AgentRail'
import type { TeamMessage as TeamMessageT } from '@/lib/types'

export default function Team() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const messagesQuery = useQuery<TeamMessageT[], Error>({
    queryKey: ['team_messages'],
    queryFn: () => listMessages(120),
    refetchInterval: 5000,
  })
  const settingsQuery = useQuery({ queryKey: ['agent_settings'], queryFn: listAgentSettings })
  const templatesQuery = useQuery({ queryKey: ['agent_templates'], queryFn: listTemplates })

  // Realtime subscription for live updates
  useEffect(() => {
    const unsubscribe = subscribeToMessages(() => {
      queryClient.invalidateQueries({ queryKey: ['team_messages'] })
    })
    return unsubscribe
  }, [queryClient])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messagesQuery.data?.length])

  const sendMutation = useMutation({
    mutationFn: postBossMessage,
    onSuccess: () => {
      setDraft('')
      queryClient.invalidateQueries({ queryKey: ['team_messages'] })
    },
  })

  function handleSend() {
    const text = draft.trim()
    if (!text || sendMutation.isPending) return
    sendMutation.mutate(text)
  }

  const messages = messagesQuery.data ?? []
  const settings = settingsQuery.data ?? []
  const templates = templatesQuery.data ?? []

  return (
    <div className="mx-auto max-w-7xl flex flex-col lg:flex-row gap-4 h-[calc(100vh-7rem)]">
      <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground">Team channel</h1>
            <p className="text-[11px] text-muted-foreground">
              Three specialists watching social, conversion, and acquisition. They run scheduled briefings, respond when you ask, and tag each other in.
            </p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {messagesQuery.isLoading && (
            <p className="text-center text-sm text-muted-foreground py-10">Loading channel…</p>
          )}
          {messagesQuery.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {messagesQuery.error.message}
            </div>
          )}
          {!messagesQuery.isLoading && messages.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm font-medium text-foreground">Channel is empty.</p>
              <p className="text-xs text-muted-foreground">
                Type a question below, or click a template on the right to ask an agent for a specific report.
              </p>
            </div>
          )}
          {messages.map((m) => <TeamMessage key={m.id} message={m} />)}
          {sendMutation.isPending && (
            <p className="text-xs text-muted-foreground italic">Routing your message…</p>
          )}
        </div>

        <footer className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend()
              }}
              placeholder="Ask the team… use @social, @cro, or @acquisition to direct."
              rows={2}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={sendMutation.isPending}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {sendMutation.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
          {sendMutation.error && (
            <p className="mt-2 text-xs text-destructive">{(sendMutation.error as Error).message}</p>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            Cmd/Ctrl + Enter to send. Smart routing picks the right agent unless you @mention.
          </p>
        </footer>
      </div>

      <AgentRail settings={settings} templates={templates} />
    </div>
  )
}
