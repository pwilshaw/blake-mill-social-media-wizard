import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarView } from '@/components/calendar/CalendarView'
import { TimelineView } from '@/components/calendar/TimelineView'
import { useCampaignsList } from '@/hooks/useCampaigns'

type ViewMode = 'calendar' | 'timeline'
type SpendFilter = 'all' | 'paid' | 'organic'

export default function Calendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [spendFilter, setSpendFilter] = useState<SpendFilter>('all')
  const navigate = useNavigate()
  const { data: campaigns = [] } = useCampaignsList()

  const filtered = campaigns.filter((c) => {
    if (spendFilter === 'paid') return !c.is_organic
    if (spendFilter === 'organic') return c.is_organic
    return true
  })

  const spendTabs: { value: SpendFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'paid', label: 'Paid' },
    { value: 'organic', label: 'Organic' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            {spendTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSpendFilter(tab.value)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  spendFilter === tab.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            <button
              onClick={() => setViewMode('calendar')}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView
          campaigns={filtered}
          onCampaignClick={(id) => navigate(`/campaigns/${id}`)}
        />
      ) : (
        <TimelineView
          campaigns={filtered}
          onCampaignClick={(id) => navigate(`/campaigns/${id}`)}
        />
      )}
    </div>
  )
}
