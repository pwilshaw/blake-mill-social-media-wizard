// T032 — Content variant review card
import type { ContentVariant } from '@/lib/types'

interface ContentVariantCardProps {
  variant: ContentVariant
  onApprove?: () => void
  onReject?: () => void
  onRevise?: () => void
}

const PLATFORM_COLOURS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-pink-100 text-pink-700',
  linkedin: 'bg-sky-100 text-sky-800',
  tiktok: 'bg-neutral-900 text-white',
}

function platformLabel(platform: string): string {
  return platform.charAt(0).toUpperCase() + platform.slice(1)
}

interface DepthGaugeProps {
  label: string
  score: number
}

function scoreColour(score: number): string {
  if (score >= 8) return 'text-emerald-600'
  if (score >= 6) return 'text-amber-500'
  return 'text-red-500'
}

function DepthGauge({ label, score }: DepthGaugeProps) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const fraction = Math.min(Math.max(score, 0), 10) / 10
  const strokeDash = fraction * circumference

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-label={`${label}: ${score}/10`}>
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted/30"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${strokeDash} ${circumference}`}
          transform="rotate(-90 24 24)"
          className={scoreColour(score)}
          stroke="currentColor"
        />
        <text
          x="24"
          y="28"
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          className={scoreColour(score)}
          fill="currentColor"
        >
          {score}
        </text>
      </svg>
      <span className="text-[10px] text-muted-foreground leading-tight text-center">
        {label}
      </span>
    </div>
  )
}

export function ContentVariantCard({
  variant,
  onApprove,
  onReject,
  onRevise,
}: ContentVariantCardProps) {
  const platformColour =
    PLATFORM_COLOURS[variant.platform] ?? 'bg-muted text-muted-foreground'

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm relative flex flex-col gap-4">
      {/* Platform badge */}
      <span
        className={`absolute top-4 right-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${platformColour}`}
      >
        {platformLabel(variant.platform)}
      </span>

      {/* Copy text */}
      <p className="text-sm text-foreground leading-relaxed pr-20 whitespace-pre-wrap">
        {variant.copy_text}
      </p>

      {/* Hashtags */}
      {variant.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {variant.hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      {variant.call_to_action && (
        <p className="text-xs font-semibold text-primary">
          CTA: {variant.call_to_action}
        </p>
      )}

      {/* DEPTH score gauges */}
      <div className="flex gap-4 pt-1">
        <DepthGauge label="Clarity" score={variant.depth_score_clarity} />
        <DepthGauge label="Persuasion" score={variant.depth_score_persuasion} />
        <DepthGauge label="Actionability" score={variant.depth_score_actionability} />
        <DepthGauge label="Accuracy" score={variant.depth_score_accuracy} />
      </div>

      {/* Uncertain claims */}
      {variant.uncertain_claims.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700">Uncertain claims</p>
          {variant.uncertain_claims.map((item, i) => (
            <div key={i}>
              <p className="text-xs text-amber-800 font-medium">"{item.claim}"</p>
              <p className="text-xs text-amber-600">{item.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {onApprove && (
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Approve
          </button>
        )}
        {onRevise && (
          <button
            type="button"
            onClick={onRevise}
            className="flex-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Revise
          </button>
        )}
        {onReject && (
          <button
            type="button"
            onClick={onReject}
            className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  )
}
