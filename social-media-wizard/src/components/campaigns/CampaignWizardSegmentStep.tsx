// T058 — Campaign wizard step: select target customer segments
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CustomerSegment, StylePreference } from '@/lib/types'

// ----------------------------------------------------------------
// Props
// ----------------------------------------------------------------

interface CampaignWizardSegmentStepProps {
  selectedSegments: string[]
  onSegmentsChange: (ids: string[]) => void
  /** Optional: boldness scores of selected shirts (1–5), used for mismatch warnings */
  selectedShirtBoldnessScores?: number[]
}

// ----------------------------------------------------------------
// Data fetching
// ----------------------------------------------------------------

async function fetchSegments(): Promise<CustomerSegment[]> {
  const { data, error } = await supabase
    .from('customer_segments')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CustomerSegment[]
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const STYLE_LABELS: Record<StylePreference, string> = {
  bold: 'Bold',
  subtle: 'Subtle',
  mixed: 'Mixed',
}

const STYLE_BADGE_CLASS: Record<StylePreference, string> = {
  bold: 'bg-orange-100 text-orange-700',
  subtle: 'bg-sky-100 text-sky-700',
  mixed: 'bg-violet-100 text-violet-700',
}

/**
 * Returns true if any selected shirt has a bold style (boldness_score >= 4)
 * and the segment prefers subtle styling — a mismatch worth warning about.
 */
function hasBoldSubtleMismatch(
  segment: CustomerSegment,
  boldnessScores: number[]
): boolean {
  if (segment.style_preference !== 'subtle') return false
  return boldnessScores.some((score) => score >= 4)
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function CampaignWizardSegmentStep({
  selectedSegments,
  onSegmentsChange,
  selectedShirtBoldnessScores = [],
}: CampaignWizardSegmentStepProps) {
  const segmentsQuery = useQuery<CustomerSegment[], Error>({
    queryKey: ['customer_segments'],
    queryFn: fetchSegments,
  })

  function toggleSegment(id: string) {
    if (selectedSegments.includes(id)) {
      onSegmentsChange(selectedSegments.filter((s) => s !== id))
    } else {
      onSegmentsChange([...selectedSegments, id])
    }
  }

  const segments = segmentsQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Target segments</p>
        <p className="text-xs text-muted-foreground">
          Select the customer segments this campaign should reach. You can choose multiple.
        </p>
      </div>

      {segmentsQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border bg-muted/30"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {segmentsQuery.error && (
        <p className="text-sm text-destructive">
          Failed to load segments: {segmentsQuery.error.message}
        </p>
      )}

      {!segmentsQuery.isLoading && segments.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No segments available. Import a survey CSV or sync from Klaviyo first.
        </p>
      )}

      {segments.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {segments.map((seg) => {
            const isSelected = selectedSegments.includes(seg.id)
            const showWarning = isSelected && hasBoldSubtleMismatch(seg, selectedShirtBoldnessScores)

            return (
              <div key={seg.id} className="space-y-1">
                <label
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-background hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSegment(seg.id)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0"
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{seg.name}</span>
                      {seg.style_preference && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE_BADGE_CLASS[seg.style_preference]}`}
                        >
                          {STYLE_LABELS[seg.style_preference]}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {seg.member_count !== null && (
                        <span>{seg.member_count.toLocaleString()} members</span>
                      )}
                      {seg.age_range && <span>Age {seg.age_range}</span>}
                      {seg.purchase_intent && (
                        <span className="capitalize">{seg.purchase_intent} intent</span>
                      )}
                    </div>
                  </div>
                </label>

                {/* Mismatch warning */}
                {showWarning && (
                  <div
                    className="ml-7 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
                    role="alert"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    <span>
                      This segment prefers subtle styles. One or more selected shirts have bold styling — consider whether this is a good fit.
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {selectedSegments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selectedSegments.length} segment{selectedSegments.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
