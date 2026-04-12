import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Pause,
  FileText,
  Image,
  TrendingUp,
  Clock,
  PoundSterling,
  Eye,
  MousePointerClick,
  ShoppingCart,
} from 'lucide-react'
import { useCampaignDetail, useUpdateCampaign } from '@/hooks/useCampaigns'
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import { PLATFORM_META } from '@/lib/platforms'
import type { Platform } from '@/lib/types'

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: campaign, isLoading, error } = useCampaignDetail(id ?? '')
  const updateCampaign = useUpdateCampaign()

  if (!id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Campaign Detail</h1>
        <p className="text-muted-foreground">No campaign specified.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <Link
          to="/campaigns"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error?.message ?? 'Campaign not found.'}
        </div>
      </div>
    )
  }

  const canPause = campaign.status === 'active'
  const canActivate = campaign.status === 'draft' || campaign.status === 'paused'

  function handleToggleStatus() {
    if (!campaign) return
    const newStatus = canPause ? 'paused' as const : 'active' as const
    updateCampaign.mutate({ id: campaign.id, status: newStatus })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/campaigns"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {campaign.campaign_type.replace('_', ' ')} &middot; Created {formatDate(campaign.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {(canPause || canActivate) && (
            <button
              onClick={handleToggleStatus}
              disabled={updateCampaign.isPending}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                canPause
                  ? 'border border-border text-muted-foreground hover:bg-muted'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {canPause ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Activate
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            Impressions
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">—</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <MousePointerClick className="h-3.5 w-3.5" />
            Clicks
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">—</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <PoundSterling className="h-3.5 w-3.5" />
            Spend
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {formatCurrency(campaign.budget_spent)}
            {campaign.budget_limit && (
              <span className="text-sm text-muted-foreground font-normal">
                {' '}/ {formatCurrency(campaign.budget_limit)}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ShoppingCart className="h-3.5 w-3.5" />
            Conversions
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">—</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            ROAS
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {campaign.performance_rating !== null
              ? `${campaign.performance_rating.toFixed(1)}x`
              : '—'}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Schedule */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start</span>
              <span className="text-foreground">
                {campaign.scheduled_start
                  ? formatDate(campaign.scheduled_start)
                  : 'Not scheduled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End</span>
              <span className="text-foreground">
                {campaign.scheduled_end
                  ? formatDate(campaign.scheduled_end)
                  : 'Ongoing'}
              </span>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Channels</h2>
          <div className="flex flex-wrap gap-2">
            {campaign.channels.length > 0 ? (
              campaign.channels.map((ch) => {
                const meta = PLATFORM_META[ch as Platform]
                return meta ? (
                  <span
                    key={ch}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${meta.color} ${meta.bgColor}`}
                  >
                    {meta.label}
                  </span>
                ) : (
                  <span
                    key={ch}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground capitalize"
                  >
                    {ch}
                  </span>
                )
              })
            ) : (
              <span className="text-sm text-muted-foreground">No channels assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to={`/campaigns/${id}/content`}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
        >
          <div className="rounded-lg bg-blue-50 p-2">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Content Review
            </p>
            <p className="text-xs text-muted-foreground">
              {campaign.content_variants_count} variant{campaign.content_variants_count !== 1 ? 's' : ''} generated
            </p>
          </div>
        </Link>
        <Link
          to={`/campaigns/${id}/creatives`}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
        >
          <div className="rounded-lg bg-pink-50 p-2">
            <Image className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Creative Gallery
            </p>
            <p className="text-xs text-muted-foreground">
              View and approve visual assets
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
