import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { CalendarView } from '@/components/calendar/CalendarView'
import { TimelineView } from '@/components/calendar/TimelineView'
import { useDashboard } from '@/hooks/useDashboard'
import { useCampaignsList } from '@/hooks/useCampaigns'
import { formatCurrency, formatNumber } from '@/lib/format'

type ViewMode = 'calendar' | 'timeline'
type Period = 'today' | '7d' | '30d'

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('7d')
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const navigate = useNavigate()

  const { metrics, isLoading } = useDashboard(period)
  const { data: campaigns = [] } = useCampaignsList()

  const chartData = [
    { date: 'Mon', spend: 12, engagement: 45, conversions: 3 },
    { date: 'Tue', spend: 18, engagement: 62, conversions: 5 },
    { date: 'Wed', spend: 15, engagement: 38, conversions: 2 },
    { date: 'Thu', spend: 22, engagement: 71, conversions: 7 },
    { date: 'Fri', spend: 19, engagement: 56, conversions: 4 },
    { date: 'Sat', spend: 8, engagement: 84, conversions: 6 },
    { date: 'Sun', spend: 5, engagement: 92, conversions: 8 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {(['today', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label="Impressions"
          value={isLoading ? '—' : formatNumber(metrics?.impressions ?? 0)}
        />
        <MetricCard
          label="Clicks"
          value={isLoading ? '—' : formatNumber(metrics?.clicks ?? 0)}
        />
        <MetricCard
          label="Spend"
          value={isLoading ? '—' : formatCurrency(metrics?.spend ?? 0)}
        />
        <MetricCard
          label="Conversions"
          value={isLoading ? '—' : formatNumber(metrics?.conversions ?? 0)}
        />
        <MetricCard
          label="ROI"
          value={isLoading ? '—' : `${(metrics?.roi ?? 0).toFixed(1)}x`}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Performance Trend
        </h2>
        <PerformanceChart data={chartData} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Campaigns</h2>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          <button
            onClick={() => setViewMode('calendar')}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Calendar
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
