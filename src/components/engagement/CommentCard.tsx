// T070 — Comment display card for engagement review

import { useState } from 'react'
import type { EngagementReply, Sentiment } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CommentCardProps {
  reply: EngagementReply
  onSend?: () => void
  onSkip?: () => void
  onFlag?: () => void
}

const SENTIMENT_CONFIG: Record<
  Sentiment,
  { label: string; className: string }
> = {
  positive: {
    label: 'Positive',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  neutral: {
    label: 'Neutral',
    className: 'bg-muted text-muted-foreground',
  },
  negative: {
    label: 'Negative',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  inappropriate: {
    label: 'Inappropriate',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
}

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const config = SENTIMENT_CONFIG[sentiment]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}

export function CommentCard({ reply, onSend, onSkip, onFlag }: CommentCardProps) {
  const [replyText, setReplyText] = useState(reply.reply_text)

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
      {/* Comment header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {reply.comment_author}
          </p>
          <p className="text-sm text-muted-foreground">{reply.comment_text}</p>
        </div>
        <SentimentBadge sentiment={reply.sentiment} />
      </div>

      {/* Generated reply */}
      <div className="space-y-1.5">
        <label
          htmlFor={`reply-${reply.id}`}
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Generated reply
        </label>
        <textarea
          id={`reply-${reply.id}`}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={3}
          className={cn(
            'w-full resize-y rounded-lg border border-border bg-background px-3 py-2',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'transition-colors',
          )}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSend}
          disabled={!replyText.trim()}
        >
          Send
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onSkip}
        >
          Skip
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onFlag}
        >
          Flag
        </Button>
      </div>
    </div>
  )
}
