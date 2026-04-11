// T047 — Detected events feed with trigger keyword highlighting
import type { ContextualTrigger } from '@/lib/types'

interface DetectedEvent {
  id: string
  title: string
  category: string
  date: string
  relevance: number
}

interface EventFeedProps {
  events: DetectedEvent[]
  triggers: ContextualTrigger[]
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function relevanceColour(score: number): string {
  if (score >= 80) return 'bg-green-500/15 text-green-700 dark:text-green-400'
  if (score >= 50) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  return 'bg-muted text-muted-foreground'
}

function matchedTriggers(event: DetectedEvent, triggers: ContextualTrigger[]): ContextualTrigger[] {
  return triggers.filter((trigger) => {
    if (!trigger.is_active || trigger.trigger_type !== 'event') return false

    const conditions = trigger.conditions as { keywords?: string[] }
    const keywords = conditions.keywords ?? []

    return keywords.some((kw) =>
      event.title.toLowerCase().includes(kw.toLowerCase()) ||
      event.category.toLowerCase().includes(kw.toLowerCase()),
    )
  })
}

export function EventFeed({ events, triggers }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No events detected. Check again later or adjust your trigger keywords.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Detected events</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          UK events from PredictHQ &amp; Ticketmaster — {events.length} found
        </p>
      </div>

      <ul className="divide-y divide-border">
        {events.map((event) => {
          const matched = matchedTriggers(event, triggers)
          const isHighlighted = matched.length > 0

          return (
            <li
              key={event.id}
              className={`flex items-start gap-4 px-4 py-3 transition-colors ${
                isHighlighted ? 'bg-primary/5' : 'hover:bg-muted/30'
              }`}
            >
              {/* Relevance badge */}
              <div className="shrink-0 pt-0.5">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${relevanceColour(event.relevance)}`}
                >
                  {event.relevance}%
                </span>
              </div>

              {/* Event details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium truncate ${isHighlighted ? 'text-primary' : 'text-foreground'}`}>
                    {event.title}
                  </p>
                  {isHighlighted && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Trigger match
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground capitalize">{event.category}</span>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="text-xs text-muted-foreground">{formatEventDate(event.date)}</span>
                </div>

                {isHighlighted && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {matched.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
