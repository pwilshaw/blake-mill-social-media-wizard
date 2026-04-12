import { useMemo } from 'react'
import { format, differenceInDays, isAfter, isBefore } from 'date-fns'
import type { Campaign } from '@/lib/types'
import { statusColour } from '@/lib/format'

interface TimelineViewProps {
  campaigns: Campaign[]
  onCampaignClick?: (id: string) => void
}

export function TimelineView({
  campaigns,
  onCampaignClick,
}: TimelineViewProps) {
  const validCampaigns = campaigns.filter(
    c => c.scheduled_start && c.scheduled_end
  )

  const dateRange = useMemo(() => {
    if (validCampaigns.length === 0) {
      const today = new Date()
      return { start: today, end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) }
    }

    const starts = validCampaigns.map(c => new Date(c.scheduled_start!))
    const ends = validCampaigns.map(c => new Date(c.scheduled_end!))
    const minStart = new Date(Math.min(...starts.map(d => d.getTime())))
    const maxEnd = new Date(Math.max(...ends.map(d => d.getTime())))

    // Add padding
    const start = new Date(minStart)
    start.setDate(start.getDate() - 2)
    const end = new Date(maxEnd)
    end.setDate(end.getDate() + 2)

    return { start, end }
  }, [validCampaigns])

  const totalDays = differenceInDays(dateRange.end, dateRange.start)
  const pixelsPerDay = 100 / totalDays // percentage per day

  const getCampaignPosition = (
    campaign: Campaign
  ): { left: number; width: number } => {
    const start = new Date(campaign.scheduled_start!)
    const end = new Date(campaign.scheduled_end!)

    const startDiff = differenceInDays(start, dateRange.start)
    const duration = differenceInDays(end, start) + 1 // inclusive

    return {
      left: startDiff * pixelsPerDay,
      width: duration * pixelsPerDay,
    }
  }

  const groupedCampaigns = useMemo(() => {
    const groups: Campaign[][] = []

    validCampaigns.forEach(campaign => {
      let placed = false

      for (const group of groups) {
        const campaignStart = new Date(campaign.scheduled_start!)
        const campaignEnd = new Date(campaign.scheduled_end!)

        const hasOverlap = group.some(existing => {
          const existingStart = new Date(existing.scheduled_start!)
          const existingEnd = new Date(existing.scheduled_end!)

          return !(
            isAfter(campaignStart, existingEnd) ||
            isBefore(campaignEnd, existingStart)
          )
        })

        if (!hasOverlap) {
          group.push(campaign)
          placed = true
          break
        }
      }

      if (!placed) {
        groups.push([campaign])
      }
    })

    return groups
  }, [validCampaigns])

  const timelineLabels = useMemo(() => {
    const labels = []
    const current = new Date(dateRange.start)

    while (!isAfter(current, dateRange.end)) {
      labels.push(new Date(current))
      current.setDate(current.getDate() + 7) // weekly labels
    }

    return labels
  }, [dateRange])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Campaign Timeline</h2>
        <p className="text-sm text-muted-foreground">
          {format(dateRange.start, 'dd MMM yyyy')} -{' '}
          {format(dateRange.end, 'dd MMM yyyy')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Timeline header with date labels */}
          <div className="mb-6 border-b pb-2">
            <div className="flex text-xs text-muted-foreground font-medium">
              <div className="w-32 flex-shrink-0" />
              <div className="relative flex-1">
                {timelineLabels.map((date, idx) => (
                  <div
                    key={idx}
                    className="absolute"
                    style={{
                      left: `${((date.getTime() - dateRange.start.getTime()) / (dateRange.end.getTime() - dateRange.start.getTime())) * 100}%`,
                    }}
                  >
                    {format(date, 'MMM d')}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Campaign rows */}
          {groupedCampaigns.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4">
              {group.map(campaign => {
                const position = getCampaignPosition(campaign)

                return (
                  <div key={campaign.id} className="flex gap-4 items-center mb-2">
                    <div className="w-32 flex-shrink-0">
                      <p className="text-sm font-medium truncate">
                        {campaign.name}
                      </p>
                    </div>

                    <div className="relative flex-1 h-8 bg-muted/30 rounded">
                      <button
                        onClick={() => onCampaignClick?.(campaign.id)}
                        className={`
                          absolute top-1 h-6 rounded
                          flex items-center justify-center
                          text-xs font-semibold text-white px-2
                          transition-opacity hover:opacity-80
                          overflow-hidden whitespace-nowrap
                          ${statusColour[campaign.status]}
                        `}
                        style={{
                          left: `${position.left}%`,
                          width: `${Math.max(position.width, 2)}%`,
                        }}
                        title={campaign.name}
                      >
                        <span className="truncate">{campaign.name}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {validCampaigns.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <p>No campaigns with scheduled dates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
