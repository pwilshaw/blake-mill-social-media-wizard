// T042 — Creative Gallery page
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { CreativeGallery } from '@/components/creatives/CreativeGallery'
import { CarouselPreview } from '@/components/creatives/CarouselPreview'
import type { CreativeAsset, AspectRatio, SimpleApprovalStatus } from '@/lib/types'

const ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16']

const APPROVAL_FILTERS: { label: string; value: SimpleApprovalStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

async function fetchAssets(campaignId: string): Promise<CreativeAsset[]> {
  const { data, error } = await supabase
    .from('creative_assets')
    .select('*, content_variants!inner(campaign_id)')
    .eq('content_variants.campaign_id', campaignId)
    .order('slide_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as CreativeAsset[]
}

async function updateAssetApproval(
  id: string,
  status: SimpleApprovalStatus
): Promise<void> {
  const { error } = await supabase
    .from('creative_assets')
    .update({ approval_status: status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export default function CreativeGalleryPage() {
  const { id: campaignId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [ratioFilter, setRatioFilter] = useState<AspectRatio | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<SimpleApprovalStatus | 'all'>('all')
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram'>(
    'instagram'
  )

  const { data: assets = [], isLoading, error } = useQuery<CreativeAsset[], Error>({
    queryKey: ['creative_assets', campaignId],
    queryFn: () => fetchAssets(campaignId ?? ''),
    enabled: Boolean(campaignId),
  })

  const approvalMutation = useMutation<
    void,
    Error,
    { id: string; status: SimpleApprovalStatus }
  >({
    mutationFn: ({ id, status }) => updateAssetApproval(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creative_assets', campaignId] })
    },
  })

  function handleApprove(id: string) {
    approvalMutation.mutate({ id, status: 'approved' })
  }

  function handleReject(id: string) {
    approvalMutation.mutate({ id, status: 'rejected' })
  }

  const filtered = assets.filter((a) => {
    const ratioMatch = ratioFilter === 'all' || a.aspect_ratio === ratioFilter
    const statusMatch = statusFilter === 'all' || a.approval_status === statusFilter
    return ratioMatch && statusMatch
  })

  const approvedAssets = assets
    .filter((a) => a.approval_status === 'approved')
    .sort((a, b) => (a.slide_order ?? 0) - (b.slide_order ?? 0))

  if (!campaignId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Creative Gallery</h1>
        <p className="text-muted-foreground">No campaign specified.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Creative Gallery</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve generated visual assets for this campaign.
        </p>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Aspect ratio filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
            Aspect ratio
          </span>
          <button
            type="button"
            onClick={() => setRatioFilter('all')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              ratioFilter === 'all'
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              type="button"
              onClick={() => setRatioFilter(ratio)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                ratioFilter === ratio
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>

        {/* Approval status filter */}
        <div className="flex items-center gap-2 flex-wrap border-b border-border pb-4">
          <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
            Status
          </span>
          {APPROVAL_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / error states */}
      {isLoading && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Loading creative assets…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load assets: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && assets.length === 0 && (
        <div className="py-20 text-center space-y-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-12 w-12 text-muted-foreground/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m3 15 5-5 4 4 3-3 6 6" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
          <p className="text-muted-foreground text-sm">No creative assets yet.</p>
          <p className="text-xs text-muted-foreground">
            Generate creatives from the campaign detail page to get started.
          </p>
        </div>
      )}

      {/* Gallery grid */}
      {!isLoading && !error && assets.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">
              All assets{' '}
              <span className="text-muted-foreground font-normal text-sm">
                ({filtered.length}/{assets.length})
              </span>
            </h2>
          </div>
          <CreativeGallery
            assets={filtered}
            onApprove={handleApprove}
            onReject={handleReject}
          />
          {filtered.length === 0 && assets.length > 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No assets match the selected filters.
            </p>
          )}
        </section>
      )}

      {/* Carousel preview for approved assets */}
      {!isLoading && !error && approvedAssets.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Carousel preview{' '}
              <span className="text-muted-foreground font-normal text-sm">
                — {approvedAssets.length} approved slide
                {approvedAssets.length !== 1 ? 's' : ''}
              </span>
            </h2>

            {/* Platform toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setPreviewPlatform('instagram')}
                className={`px-3 py-1.5 transition-colors ${
                  previewPlatform === 'instagram'
                    ? 'bg-foreground text-background'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Instagram
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform('facebook')}
                className={`px-3 py-1.5 transition-colors border-l border-border ${
                  previewPlatform === 'facebook'
                    ? 'bg-foreground text-background'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Facebook
              </button>
            </div>
          </div>

          <div className="max-w-sm mx-auto">
            <CarouselPreview assets={approvedAssets} platform={previewPlatform} />
          </div>
        </section>
      )}
    </div>
  )
}
