import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Rocket,
  TrendingUp,
  Bot,
  BarChart3,
} from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { PerformanceChart } from '@/components/dashboard/PerformanceChart'
import { CalendarView } from '@/components/calendar/CalendarView'
import { TimelineView } from '@/components/calendar/TimelineView'
import { useDashboard } from '@/hooks/useDashboard'
import { useCampaignsList } from '@/hooks/useCampaigns'
import { formatCurrency, formatNumber } from '@/lib/format'

type DashboardTab = 'overview' | 'campaigns' | 'analytics'
type Period = 'today' | '7d' | '30d'
type ViewMode = 'calendar' | 'timeline'

const DEMO_SPARKLINES = {
  impressions: [120, 180, 150, 220, 280, 260, 310],
  clicks: [18, 32, 25, 41, 38, 52, 48],
  spend: [12, 18, 15, 22, 19, 8, 5],
  conversions: [3, 5, 2, 7, 4, 6, 8],
  roi: [1.8, 2.1, 1.5, 2.8, 2.3, 3.1, 3.4],
}

const QUICK_ACTIONS = [
  {
    icon: Rocket,
    label: 'Quick Launch',
    description: 'One-click campaign from a template',
    route: '/campaigns?quick=true',
    color: 'text-blue-600 bg-blue-50',
  },
  {
    icon: Bot,
    label: 'AI Media Buyer',
    description: '24/7 automated bid optimization',
    route: '/media-buyer',
    color: 'text-violet-600 bg-violet-50',
  },
  {
    icon: BarChart3,
    label: 'Conversions',
    description: 'Real-time tracking & attribution',
    route: '/conversions',
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: TrendingUp,
    label: 'Performance',
    description: 'Deep dive into campaign analytics',
    route: '/campaigns',
    color: 'text-amber-600 bg-amber-50',
  },
]

export default function Dashboard() {
  const [tab, setTab] = useState<DashboardTab>('overview')
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

  const activeCampaigns = campaigns.filter((c) => c.status === 'active')
  const scheduledCampaigns = campaigns.filter((c) => c.status === 'scheduled')

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {activeCampaigns.length} active campaign{activeCampaigns.length !== 1 ? 's' : ''}
            {scheduledCampaigns.length > 0 && (
              <> &middot; {scheduledCampaigns.length} scheduled</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {(['today', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* New campaign CTA */}
          <button
            onClick={() => navigate('/campaigns?new=true')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Rocket className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'campaigns', label: 'Campaigns' },
          { key: 'analytics', label: 'Analytics' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              label="Impressions"
              value={isLoading ? '—' : formatNumber(metrics?.impressions ?? 0)}
              trend={{ change_pct: 12.3 }}
              sparkline={DEMO_SPARKLINES.impressions}
              accentColor="#3b82f6"
            />
            <MetricCard
              label="Clicks"
              value={isLoading ? '—' : formatNumber(metrics?.clicks ?? 0)}
              trend={{ change_pct: 8.7 }}
              sparkline={DEMO_SPARKLINES.clicks}
              accentColor="#8b5cf6"
            />
            <MetricCard
              label="Spend"
              value={isLoading ? '—' : formatCurrency(metrics?.spend ?? 0)}
              trend={{ change_pct: -3.2 }}
              sparkline={DEMO_SPARKLINES.spend}
              accentColor="#f59e0b"
            />
            <MetricCard
              label="Conversions"
              value={isLoading ? '—' : formatNumber(metrics?.conversions ?? 0)}
              trend={{ change_pct: 24.1 }}
              sparkline={DEMO_SPARKLINES.conversions}
              accentColor="#22c55e"
            />
            <MetricCard
              label="ROAS"
              value={isLoading ? '—' : `${(metrics?.roi ?? 0).toFixed(1)}x`}
              trend={{ change_pct: 15.6 }}
              sparkline={DEMO_SPARKLINES.roi}
              accentColor="#06b6d4"
            />
          </div>

          {/* Quick actions grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.route}
                onClick={() => navigate(action.route)}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className={`rounded-lg p-2 ${action.color}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Performance chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Performance Trend</h2>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Spend
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Engagement
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Conversions
                </span>
              </div>
            </div>
            <PerformanceChart data={chartData} />
          </div>
        </div>
      )}

      {/* === CAMPAIGNS TAB === */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Campaign Schedule</h2>
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => setViewMode('calendar')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-foreground text-background shadow-sm'
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
      )}

      {/* === ANALYTICS TAB === */}
      {tab === 'analytics' && (
        <div className="space-y-6">
          {/* Channel comparison */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Channel Performance Comparison
            </h2>
            <div className="space-y-3">
              {[
                { name: 'Facebook', spend: 340, roas: 3.2, conversions: 48, pct: 85 },
                { name: 'Instagram', spend: 280, roas: 2.8, conversions: 35, pct: 70 },
                { name: 'Google Ads', spend: 220, roas: 4.1, conversions: 52, pct: 95 },
                { name: 'TikTok', spend: 150, roas: 1.9, conversions: 18, pct: 45 },
              ].map((ch) => (
                <div key={ch.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{ch.name}</span>
                    <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
                      <span>{formatCurrency(ch.spend)} spent</span>
                      <span>{ch.roas}x ROAS</span>
                      <span>{ch.conversions} conversions</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${ch.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top performing content */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Top Performing Content
            </h2>
            <div className="space-y-3">
              {[
                {
                  title: 'Summer Violet Haze Collection',
                  platform: 'Instagram',
                  engagement: '12.4%',
                  impressions: '8.2K',
                },
                {
                  title: 'Midnight Blue — Smart Casual Guide',
                  platform: 'Facebook',
                  engagement: '9.8%',
                  impressions: '6.1K',
                },
                {
                  title: 'New Arrivals: Coral Reef Series',
                  platform: 'Google Ads',
                  engagement: '7.2%',
                  impressions: '14.5K',
                },
              ].map((content, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{content.title}</p>
                    <p className="text-xs text-muted-foreground">{content.platform}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                      {content.engagement} eng.
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {content.impressions} impr.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance chart (duplicated for analytics deep-dive) */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Spend vs Conversions
            </h2>
            <PerformanceChart data={chartData} />
          </div>
        </div>
      )}
    </div>
  )
}
