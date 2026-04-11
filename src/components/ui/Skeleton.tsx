// T082 — Skeleton loading component

import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Base Skeleton
// ---------------------------------------------------------------------------

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
    />
  )
}

// ---------------------------------------------------------------------------
// MetricCardSkeleton — mirrors the metric card layout
// ---------------------------------------------------------------------------

function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3" aria-busy="true" aria-label="Loading metric">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-36" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// CampaignListSkeleton — mirrors the campaign list row layout
// ---------------------------------------------------------------------------

interface CampaignListSkeletonProps {
  rows?: number
}

function CampaignListSkeleton({ rows = 5 }: CampaignListSkeletonProps) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3"
        >
          <Skeleton className="h-10 w-10 rounded-md shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full shrink-0" />
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ContentCardSkeleton — mirrors the content/creative card layout
// ---------------------------------------------------------------------------

function ContentCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden" aria-busy="true" aria-label="Loading content">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export { Skeleton, MetricCardSkeleton, CampaignListSkeleton, ContentCardSkeleton }
export type { SkeletonProps }
