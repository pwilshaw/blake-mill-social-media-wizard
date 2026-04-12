// T053 — Card displaying a customer segment with all key attributes
import type { CustomerSegment, StylePreference, PurchaseIntent } from '@/lib/types'

interface SegmentCardProps {
  segment: CustomerSegment
}

const STYLE_BADGE: Record<StylePreference, { label: string; className: string }> = {
  bold: {
    label: 'Bold',
    className: 'bg-orange-100 text-orange-700 border border-orange-200',
  },
  subtle: {
    label: 'Subtle',
    className: 'bg-sky-100 text-sky-700 border border-sky-200',
  },
  mixed: {
    label: 'Mixed',
    className: 'bg-violet-100 text-violet-700 border border-violet-200',
  },
}

const INTENT_INDICATOR: Record<PurchaseIntent, { label: string; className: string }> = {
  high: { label: 'High intent', className: 'text-emerald-600' },
  medium: { label: 'Medium intent', className: 'text-amber-500' },
  low: { label: 'Low intent', className: 'text-muted-foreground' },
}

export function SegmentCard({ segment }: SegmentCardProps) {
  const styleBadge = segment.style_preference
    ? STYLE_BADGE[segment.style_preference]
    : null

  const intentIndicator = segment.purchase_intent
    ? INTENT_INDICATOR[segment.purchase_intent]
    : null

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{segment.name}</h3>
          <p className="text-xs text-muted-foreground capitalize">{segment.source}</p>
        </div>
        {styleBadge && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styleBadge.className}`}
          >
            {styleBadge.label}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segment.member_count !== null && (
          <span>
            <span className="font-medium text-foreground">
              {segment.member_count.toLocaleString()}
            </span>{' '}
            members
          </span>
        )}
        {segment.age_range && (
          <span>
            Age{' '}
            <span className="font-medium text-foreground">{segment.age_range}</span>
          </span>
        )}
        {intentIndicator && (
          <span className={`font-medium ${intentIndicator.className}`}>
            {intentIndicator.label}
          </span>
        )}
      </div>

      {/* Purchase occasions */}
      {segment.purchase_occasions.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Purchase occasions">
          {segment.purchase_occasions.map((occasion) => (
            <span
              key={occasion}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {occasion}
            </span>
          ))}
        </div>
      )}

      {/* Klaviyo link */}
      {segment.klaviyo_segment_id && (
        <a
          href={`https://www.klaviyo.com/segment/${segment.klaviyo_segment_id}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          aria-label={`Open ${segment.name} in Klaviyo`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
          View in Klaviyo
        </a>
      )}
    </article>
  )
}
