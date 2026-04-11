// T036 — Campaign list page
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampaignsList } from '@/hooks/useCampaigns'
import { CampaignStatusBadge } from '@/components/campaigns/CampaignStatusBadge'
import { CampaignWizard } from '@/components/campaigns/CampaignWizard'
import { formatDate } from '@/lib/format'
import type { CampaignStatus } from '@/lib/types'
import { useNavigate } from 'react-router-dom'

const STATUS_FILTERS: { label: string; value: CampaignStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
]

export default function Campaigns() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | undefined>(undefined)
  const [showWizard, setShowWizard] = useState(false)
  const navigate = useNavigate()

  const { data: campaigns = [], isLoading, error } = useCampaignsList(statusFilter)

  function handleWizardComplete(campaignId: string) {
    setShowWizard(false)
    navigate(`/campaigns/${campaignId}`)
  }

  if (showWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowWizard(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to campaigns
          </button>
        </div>
        <CampaignWizard onComplete={handleWizardComplete} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your social media campaigns.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          New Campaign
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap border-b border-border pb-4">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Loading campaigns…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load campaigns: {error.message}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && campaigns.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <p className="text-muted-foreground text-sm">No campaigns found.</p>
          <p className="text-xs text-muted-foreground">
            Create your first campaign to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            New Campaign
          </button>
        </div>
      )}

      {/* Campaign list */}
      {!isLoading && !error && campaigns.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Campaign
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">
                  Created
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground">
                  Channels
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-4">
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {campaign.campaign_type.replace('_', ' ')}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 text-muted-foreground">
                    {formatDate(campaign.created_at)}
                  </td>
                  <td className="hidden md:table-cell px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {campaign.channels.length > 0 ? (
                        campaign.channels.map((ch) => (
                          <span
                            key={ch}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize"
                          >
                            {ch}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      to={`/campaigns/${campaign.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
