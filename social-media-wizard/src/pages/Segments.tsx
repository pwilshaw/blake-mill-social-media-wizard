// T057 — Segments page: grid of SegmentCards, SurveyImporter, Klaviyo sync, filters
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CustomerSegment, SegmentSource, StylePreference } from '@/lib/types'
import { SegmentCard } from '@/components/segments/SegmentCard'
import { SurveyImporter } from '@/components/segments/SurveyImporter'
import { KlaviyoConnector } from '@/components/segments/KlaviyoConnector'

// ----------------------------------------------------------------
// Data fetching
// ----------------------------------------------------------------

async function fetchSegments(
  source: SegmentSource | '',
  stylePreference: StylePreference | ''
): Promise<CustomerSegment[]> {
  let query = supabase
    .from('customer_segments')
    .select('*')
    .order('name', { ascending: true })

  if (source) query = query.eq('source', source)
  if (stylePreference) query = query.eq('style_preference', stylePreference)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as CustomerSegment[]
}

async function triggerKlaviyoSync(): Promise<{ synced_count: number }> {
  const { data, error } = await supabase.functions.invoke<{ synced_count: number }>(
    'sync-klaviyo',
    { method: 'POST' }
  )
  if (error) throw new Error(error.message)
  return data ?? { synced_count: 0 }
}

// ----------------------------------------------------------------
// Filter bar
// ----------------------------------------------------------------

const SOURCE_OPTIONS: Array<{ value: SegmentSource | ''; label: string }> = [
  { value: '', label: 'All sources' },
  { value: 'survey', label: 'Survey' },
  { value: 'klaviyo', label: 'Klaviyo' },
  { value: 'manual', label: 'Manual' },
  { value: 'combined', label: 'Combined' },
]

const STYLE_OPTIONS: Array<{ value: StylePreference | ''; label: string }> = [
  { value: '', label: 'All styles' },
  { value: 'bold', label: 'Bold' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'mixed', label: 'Mixed' },
]

interface FilterBarProps {
  source: SegmentSource | ''
  stylePreference: StylePreference | ''
  onSourceChange: (v: SegmentSource | '') => void
  onStyleChange: (v: StylePreference | '') => void
}

function FilterBar({ source, stylePreference, onSourceChange, onStyleChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={source}
        onChange={(e) => onSourceChange(e.target.value as SegmentSource | '')}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filter by source"
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={stylePreference}
        onChange={(e) => onStyleChange(e.target.value as StylePreference | '')}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Filter by style preference"
      >
        {STYLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ----------------------------------------------------------------
// Page
// ----------------------------------------------------------------

export default function Segments() {
  const queryClient = useQueryClient()

  const [sourceFilter, setSourceFilter] = useState<SegmentSource | ''>('')
  const [styleFilter, setStyleFilter] = useState<StylePreference | ''>('')
  const [showImporter, setShowImporter] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const segmentsQuery = useQuery<CustomerSegment[], Error>({
    queryKey: ['customer_segments', sourceFilter, styleFilter],
    queryFn: () => fetchSegments(sourceFilter, styleFilter),
  })

  const syncMutation = useMutation<{ synced_count: number }, Error>({
    mutationFn: triggerKlaviyoSync,
    onSuccess: (result) => {
      setSyncMessage(`Synced ${result.synced_count} segment${result.synced_count !== 1 ? 's' : ''} from Klaviyo.`)
      void queryClient.invalidateQueries({ queryKey: ['customer_segments'] })
    },
    onError: (err) => {
      setSyncMessage(`Sync failed: ${err.message}`)
    },
  })

  function handleSyncClick() {
    setSyncMessage(null)
    syncMutation.mutate()
  }

  const segments = segmentsQuery.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Segments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customer segments from surveys, Klaviyo, and manual entry.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setShowImporter((v) => !v); setSyncMessage(null) }}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {showImporter ? 'Hide importer' : 'Import survey CSV'}
          </button>

          <button
            type="button"
            onClick={handleSyncClick}
            disabled={syncMutation.isPending}
            className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncMutation.isPending ? 'Syncing…' : 'Sync Klaviyo'}
          </button>
        </div>
      </div>

      {/* Sync status */}
      {syncMessage && (
        <div
          className={`rounded-md border px-4 py-2.5 text-sm ${
            syncMessage.startsWith('Sync failed')
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role="status"
        >
          {syncMessage}
        </div>
      )}

      {/* Klaviyo connector */}
      <KlaviyoConnector />

      {/* Survey importer panel */}
      {showImporter && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <SurveyImporter />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterBar
          source={sourceFilter}
          stylePreference={styleFilter}
          onSourceChange={setSourceFilter}
          onStyleChange={setStyleFilter}
        />
        {!segmentsQuery.isLoading && (
          <p className="text-xs text-muted-foreground">
            {segments.length} segment{segments.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Loading */}
      {segmentsQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-lg border bg-muted/30"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {segmentsQuery.error && (
        <p className="text-sm text-destructive">
          Failed to load segments: {segmentsQuery.error.message}
        </p>
      )}

      {/* Empty state */}
      {!segmentsQuery.isLoading && !segmentsQuery.error && segments.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No segments found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Import a survey CSV or sync from Klaviyo to create segments.
          </p>
        </div>
      )}

      {/* Segment grid */}
      {segments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((seg) => (
            <SegmentCard key={seg.id} segment={seg} />
          ))}
        </div>
      )}
    </div>
  )
}
