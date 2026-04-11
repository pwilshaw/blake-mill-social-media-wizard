// T075 — Engagement page: Pending Review / Flagged / Sent tabs with bulk send and search

import { useState, useEffect, useCallback } from 'react'
import type { EngagementReply, ReplyStatus } from '@/lib/types'
import { CommentCard } from '@/components/engagement/CommentCard'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'pending' | 'flagged' | 'sent'

interface Tab {
  id: TabId
  label: string
  statuses: ReplyStatus[]
}

const TABS: Tab[] = [
  { id: 'pending', label: 'Pending Review', statuses: ['pending_review'] },
  { id: 'flagged', label: 'Flagged', statuses: ['flagged'] },
  { id: 'sent', label: 'Sent', statuses: ['auto_sent', 'manually_sent'] },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sendReply(replyId: string, manual: boolean): Promise<void> {
  const { error } = await supabase.functions.invoke('engagement/send-reply', {
    body: { reply_id: replyId, manual },
  })
  if (error) throw error
}

async function patchReply(
  replyId: string,
  updates: { reply_status?: ReplyStatus; reply_text?: string },
): Promise<void> {
  const { error } = await supabase.functions.invoke('engagement', {
    method: 'PATCH',
    body: { id: replyId, ...updates },
  })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Engagement() {
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [replies, setReplies] = useState<EngagementReply[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [bulkSending, setBulkSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReplies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const tab = TABS.find((t) => t.id === activeTab)!
      const { data, error: fetchError } = await supabase
        .from('engagement_replies')
        .select('*')
        .in('reply_status', tab.statuses)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      setReplies(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replies')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchReplies()
  }, [fetchReplies])

  const filteredReplies = replies.filter((r) =>
    search.trim() === '' ||
    r.comment_text.toLowerCase().includes(search.trim().toLowerCase()),
  )

  async function handleSend(replyId: string) {
    try {
      await sendReply(replyId, true)
      await fetchReplies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply')
    }
  }

  async function handleSkip(replyId: string) {
    try {
      await patchReply(replyId, { reply_status: 'skipped' })
      await fetchReplies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip reply')
    }
  }

  async function handleFlag(replyId: string) {
    try {
      await patchReply(replyId, { reply_status: 'flagged' })
      await fetchReplies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to flag reply')
    }
  }

  async function handleBulkSend() {
    if (filteredReplies.length === 0) return
    setBulkSending(true)
    setError(null)
    try {
      await Promise.allSettled(
        filteredReplies.map((r) => sendReply(r.id, false)),
      )
      await fetchReplies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk send failed')
    } finally {
      setBulkSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Engagement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Review and send AI-generated comment replies.
          </p>
        </div>
        {activeTab === 'pending' && (
          <Button
            onClick={handleBulkSend}
            disabled={bulkSending || filteredReplies.length === 0}
            size="sm"
          >
            {bulkSending ? 'Sending…' : `Send All (${filteredReplies.length})`}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6" aria-label="Engagement tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by comment text…"
          className={cn(
            'w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'transition-colors',
          )}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filteredReplies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {search.trim() !== ''
            ? 'No comments match your search.'
            : 'No comments in this tab.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReplies.map((reply) => (
            <CommentCard
              key={reply.id}
              reply={reply}
              onSend={
                activeTab !== 'sent'
                  ? () => handleSend(reply.id)
                  : undefined
              }
              onSkip={
                activeTab === 'pending'
                  ? () => handleSkip(reply.id)
                  : undefined
              }
              onFlag={
                activeTab === 'pending'
                  ? () => handleFlag(reply.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
