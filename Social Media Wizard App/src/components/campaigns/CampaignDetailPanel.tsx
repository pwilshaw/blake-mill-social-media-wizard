import type { Campaign } from '@/lib/types'
import { formatDate, formatCurrency } from '@/lib/format'
import { CampaignStatusBadge } from './CampaignStatusBadge'

interface CampaignDetailPanelProps {
  campaign: Campaign
}

export function CampaignDetailPanel({ campaign }: CampaignDetailPanelProps) {
  const budgetPercentage =
    campaign.budget_limit && campaign.budget_limit > 0
      ? Math.min((campaign.budget_spent / campaign.budget_limit) * 100, 100)
      : 0

  const dateRange = campaign.scheduled_start && campaign.scheduled_end
    ? `${formatDate(campaign.scheduled_start)} - ${formatDate(campaign.scheduled_end)}`
    : 'No dates set'

  const performanceRating = campaign.performance_rating ?? 0

  const keyMetrics = [
    {
      label: 'Campaign Type',
      value: campaign.campaign_type.replace(/_/g, ' ').charAt(0).toUpperCase() + campaign.campaign_type.replace(/_/g, ' ').slice(1),
    },
    {
      label: 'Channels',
      value: campaign.channels.length > 0 ? campaign.channels.join(', ') : 'None',
    },
    {
      label: 'Target Segments',
      value: campaign.target_segments.length > 0
        ? campaign.target_segments.join(', ')
        : 'None',
    },
    {
      label: 'Auto-Approved',
      value: campaign.auto_approved ? 'Yes' : 'No',
    },
  ]

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">
            {campaign.name}
          </h2>
          <CampaignStatusBadge status={campaign.status} />
        </div>

        <p className="text-sm text-muted-foreground">{dateRange}</p>
      </div>

      {/* Budget Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Budget</h3>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(campaign.budget_spent)} of{' '}
            {campaign.budget_limit
              ? formatCurrency(campaign.budget_limit)
              : 'Unlimited'}
          </span>
        </div>

        {campaign.budget_limit && campaign.budget_limit > 0 && (
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${budgetPercentage}%`,
              }}
            />
          </div>
        )}

        {campaign.budget_limit && (
          <p className="text-xs text-muted-foreground">
            {budgetPercentage.toFixed(1)}% of budget used
          </p>
        )}
      </div>

      {/* Performance Rating Section */}
      {performanceRating > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Performance Rating
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-primary">
              {performanceRating.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">/10</span>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {keyMetrics.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Key Details</h3>
          <dl className="space-y-2 text-sm">
            {keyMetrics.map(metric => (
              <div
                key={metric.label}
                className="flex justify-between items-start gap-4"
              >
                <dt className="text-muted-foreground">{metric.label}</dt>
                <dd className="font-medium text-foreground text-right">
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
