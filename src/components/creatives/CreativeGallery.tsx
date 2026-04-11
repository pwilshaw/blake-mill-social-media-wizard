// T039 — Creative asset gallery grid
import type { CreativeAsset, SimpleApprovalStatus } from '@/lib/types'

interface CreativeGalleryProps {
  assets: CreativeAsset[]
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

const ASPECT_RATIO_CLASSES: Record<string, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
}

const APPROVAL_BADGE: Record<SimpleApprovalStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

function approvalLabel(status: SimpleApprovalStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

interface CreativeCardProps {
  asset: CreativeAsset
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

function CreativeCard({ asset, onApprove, onReject }: CreativeCardProps) {
  const aspectClass = ASPECT_RATIO_CLASSES[asset.aspect_ratio] ?? 'aspect-square'
  const badgeClass = APPROVAL_BADGE[asset.approval_status]

  return (
    <div className="rounded-lg border bg-card overflow-hidden shadow-sm flex flex-col">
      {/* Image area */}
      <div className={`relative w-full ${aspectClass} bg-muted overflow-hidden`}>
        {asset.generated_image_url ? (
          <img
            src={asset.generated_image_url}
            alt={asset.overlay_text ?? 'Creative asset'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 opacity-40"
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
            <span className="text-xs">No image generated</span>
          </div>
        )}

        {/* Aspect ratio badge */}
        <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {asset.aspect_ratio}
        </span>

        {/* Slide order badge */}
        {asset.slide_order !== null && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            Slide {asset.slide_order}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Overlay text */}
        {asset.overlay_text && (
          <p className="text-sm text-foreground leading-snug line-clamp-2">
            {asset.overlay_text}
          </p>
        )}

        {/* Status + asset type row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
          >
            {approvalLabel(asset.approval_status)}
          </span>
          <span className="text-[11px] text-muted-foreground capitalize">
            {asset.asset_type.replace('_', ' ')}
          </span>
        </div>

        {/* Action buttons */}
        {(onApprove || onReject) && (
          <div className="flex gap-2 pt-1">
            {onApprove && (
              <button
                type="button"
                onClick={() => onApprove(asset.id)}
                disabled={asset.approval_status === 'approved'}
                className="flex-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Approve
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={() => onReject(asset.id)}
                disabled={asset.approval_status === 'rejected'}
                className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reject
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function CreativeGallery({ assets, onApprove, onReject }: CreativeGalleryProps) {
  if (assets.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-muted-foreground text-sm">No creative assets to display.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {assets.map((asset) => (
        <CreativeCard
          key={asset.id}
          asset={asset}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  )
}
