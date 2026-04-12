import type { CampaignStatus } from '@/lib/types'
import { statusColour } from '@/lib/format'

interface CampaignStatusBadgeProps {
  status: CampaignStatus
}

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const colorClasses = statusColour[status]
  const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}
    >
      {capitalizedStatus}
    </span>
  );
}
