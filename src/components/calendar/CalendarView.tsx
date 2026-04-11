import { useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isAfter,
  isBefore,
} from 'date-fns'
import type { Campaign } from '@/lib/types'
import { statusColour } from '@/lib/format'

interface CalendarViewProps {
  campaigns: Campaign[]
  onCampaignClick?: (id: string) => void
}

export function CalendarView({
  campaigns,
  onCampaignClick,
}: CalendarViewProps) {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const daysByWeek = useMemo(() => {
    const weeks: Date[][] = []
    let currentWeek: Date[] = []

    // Pad first week with previous month's days to fill Mon-Sun grid
    const firstDayOfWeek = monthStart.getDay()
    const startDate = new Date(monthStart)
    startDate.setDate(startDate.getDate() - (firstDayOfWeek || 6) + 1)

    const paddedDays = eachDayOfInterval({
      start: startDate,
      end: monthEnd,
    })

    paddedDays.forEach(day => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push(day)
    })

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStart.getTime(), monthEnd.getTime()])

  const getCampaignsForDay = (day: Date): Campaign[] => {
    return campaigns.filter(campaign => {
      if (!campaign.scheduled_start || !campaign.scheduled_end) return false

      const campaignStart = new Date(campaign.scheduled_start)
      const campaignEnd = new Date(campaign.scheduled_end)
      const dayStart = new Date(day)
      const dayEnd = new Date(day)

      dayStart.setHours(0, 0, 0, 0)
      dayEnd.setHours(23, 59, 59, 999)

      return !(
        isAfter(campaignStart, dayEnd) || isBefore(campaignEnd, dayStart)
      )
    })
  }

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          {format(today, 'MMMM yyyy')}
        </h2>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 bg-muted/30 p-4 rounded-lg">
          {/* Day headers */}
          {dayLabels.map(label => (
            <div
              key={label}
              className="text-center text-sm font-semibold text-muted-foreground py-2"
            >
              {label}
            </div>
          ))}

          {/* Calendar cells */}
          {daysByWeek.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day, monthStart)
              const isToday = isSameDay(day, today)
              const dayCampaigns = getCampaignsForDay(day)

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`
                    min-h-24 rounded border p-2 transition-colors
                    ${
                      isCurrentMonth
                        ? 'bg-card hover:bg-accent/50 cursor-default'
                        : 'bg-muted/10 opacity-50'
                    }
                    ${isToday ? 'ring-2 ring-primary ring-inset' : ''}
                  `}
                >
                  <div className="text-xs font-semibold mb-1 text-foreground">
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1 text-xs">
                    {dayCampaigns.slice(0, 3).map(campaign => (
                      <button
                        key={campaign.id}
                        onClick={() => onCampaignClick?.(campaign.id)}
                        className={`
                          w-full text-left px-1.5 py-0.5 rounded
                          transition-opacity hover:opacity-80
                          truncate text-white font-medium
                          ${statusColour[campaign.status]}
                        `}
                      >
                        {campaign.name}
                      </button>
                    ))}

                    {dayCampaigns.length > 3 && (
                      <div className="text-xs text-muted-foreground font-medium">
                        +{dayCampaigns.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
