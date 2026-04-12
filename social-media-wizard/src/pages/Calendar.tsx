import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarView } from '@/components/calendar/CalendarView'
import { TimelineView } from '@/components/calendar/TimelineView'
import { useCampaignsList } from '@/hooks/useCampaigns'

type ViewMode = 'calendar' | 'timeline'

export default function Calendar() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const navigate = useNavigate()
  const { data: campaigns = [] } = useCampaignsList()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Calendar</h1>
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

      {viewMode === 'calendar' ? (
        <CalendarView
          campaigns={campaigns}
          onCampaignClick={(id) => navigate(`/campaigns/${id}`)}
        />
      ) : (
        <TimelineView
          campaigns={campaigns}
          onCampaignClick={(id) => navigate(`/campaigns/${id}`)}
        />
      )}
    </div>
  )
}
