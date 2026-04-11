// T034 — Content review page
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ContentVariantCard } from '@/components/content/ContentVariantCard'
import type { ContentVariant, Platform, ApprovalStatus } from '@/lib/types'

const PLATFORMS: Platform[] = ['facebook', 'instagram', 'linkedin', 'tiktok']

const APPROVAL_TABS: { label: string; value: ApprovalStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Revision Requested', value: 'revision_requested' },
]

async function fetchVariants(campaignId: string): Promise<ContentVariant[]> {
  const { data, error } = await supabase
    .from('content_variants')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ContentVariant[]
}

async function updateApprovalStatus(
  id: string,
  status: ApprovalStatus
): Promise<void> {
  const { error } = await supabase
    .from('content_variants')
    .update({ approval_status: status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export default function ContentReview() {
  const { id: campaignId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: variants = [], isLoading, error } = useQuery<ContentVariant[], Error>({
    queryKey: ['content_variants', campaignId],
    queryFn: () => fetchVariants(campaignId ?? ''),
    enabled: Boolean(campaignId),
  })

  const statusMutation = useMutation<void, Error, { id: string; status: ApprovalStatus }>({
    mutationFn: ({ id, status }) => updateApprovalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_variants', campaignId] })
    },
  })

  function handleApprove(id: string) {
    statusMutation.mutate({ id, status: 'approved' })
  }

  function handleReject(id: string) {
    statusMutation.mutate({ id, status: 'rejected' })
  }

  function handleRevise(id: string) {
    statusMutation.mutate({ id, status: 'revision_requested' })
  }

  function handleBulkApprove() {
    selected.forEach((id) => statusMutation.mutate({ id, status: 'approved' }))
    setSelected(new Set())
  }

  function handleBulkReject() {
    selected.forEach((id) => statusMutation.mutate({ id, status: 'rejected' }))
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filtered = variants.filter((v) => {
    const platformMatch = platformFilter === 'all' || v.platform === platformFilter
    const statusMatch = statusFilter === 'all' || v.approval_status === statusFilter
    return platformMatch && statusMatch
  })

  if (!campaignId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Content Review</h1>
        <p className="text-muted-foreground">No campaign specified.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Content Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve AI-generated content variants.
          </p>
        </div>

        {selected.size > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBulkApprove}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Approve {selected.size} selected
            </button>
            <button
              type="button"
              onClick={handleBulkReject}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Reject {selected.size} selected
            </button>
          </div>
        )}
      </div>

      {/* Platform filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setPlatformFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            platformFilter === 'all'
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All platforms
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlatformFilter(p)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
              platformFilter === p
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Approval status filter tabs */}
      <div className="flex gap-2 flex-wrap border-b border-border pb-4">
        {APPROVAL_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Loading content variants…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load content: {error.message}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <p className="text-muted-foreground text-sm">No content variants found.</p>
          {variants.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Generate content from the campaign detail page to get started.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Try adjusting the platform or status filters.
            </p>
          )}
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((variant) => (
            <div key={variant.id} className="relative">
              {/* Selection checkbox */}
              <label className="absolute top-4 left-4 z-10 flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(variant.id)}
                  onChange={() => toggleSelect(variant.id)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  aria-label={`Select variant for ${variant.platform}`}
                />
              </label>
              <ContentVariantCard
                variant={variant}
                onApprove={() => handleApprove(variant.id)}
                onReject={() => handleReject(variant.id)}
                onRevise={() => handleRevise(variant.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
