// Dashboard metrics + chart data hooks
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DashboardMetrics, PerformanceSnapshot } from '@/lib/types'

type Period = 'today' | '7d' | '30d'

function periodToStartDate(period: Period): string {
  const now = new Date()
  if (period === 'today') {
    now.setHours(0, 0, 0, 0)
    return now.toISOString()
  }
  const days = period === '7d' ? 7 : 30
  now.setDate(now.getDate() - days)
  return now.toISOString()
}

async function fetchDashboardMetrics(period: Period): Promise<DashboardMetrics> {
  const startDate = periodToStartDate(period)

  const { data, error } = await supabase
    .from('performance_snapshots')
    .select('*')
    .gte('snapshot_at', startDate)
    .order('snapshot_at', { ascending: false })

  if (error) {
    // Table may be empty — return zeros instead of erroring
    return {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      roi: 0,
      campaigns_active: 0,
      period,
    }
  }

  const snapshots = (data ?? []) as PerformanceSnapshot[]

  const totalImpressions = snapshots.reduce((sum, s) => sum + s.total_impressions, 0)
  const totalClicks = snapshots.reduce((sum, s) => sum + s.total_clicks, 0)
  const totalSpend = snapshots.reduce((sum, s) => sum + s.total_spend, 0)
  const totalConversions = snapshots.reduce((sum, s) => sum + s.total_conversions, 0)
  const avgRoi =
    snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.roi, 0) / snapshots.length
      : 0

  const activeCampaignIds = new Set(snapshots.map((s) => s.campaign_id))

  return {
    impressions: totalImpressions,
    clicks: totalClicks,
    spend: totalSpend,
    conversions: totalConversions,
    roi: parseFloat(avgRoi.toFixed(2)),
    campaigns_active: activeCampaignIds.size,
    period,
  }
}

export interface ChartDataPoint {
  date: string
  spend: number
  engagement: number
  conversions: number
}

async function fetchChartData(period: Period): Promise<ChartDataPoint[]> {
  const startDate = periodToStartDate(period)

  // Try channel_posts for real data
  const { data: posts } = await supabase
    .from('channel_posts')
    .select('published_at, spend, engagement_count, clicks')
    .gte('published_at', startDate)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: true })

  if (posts && posts.length > 0) {
    // Group by day
    const byDay = new Map<string, { spend: number; engagement: number; conversions: number }>()
    for (const post of posts) {
      const day = new Date(post.published_at).toLocaleDateString('en-GB', { weekday: 'short' })
      const existing = byDay.get(day) ?? { spend: 0, engagement: 0, conversions: 0 }
      existing.spend += post.spend ?? 0
      existing.engagement += post.engagement_count ?? 0
      existing.conversions += post.clicks ?? 0
      byDay.set(day, existing)
    }
    return Array.from(byDay.entries()).map(([date, vals]) => ({ date, ...vals }))
  }

  // No data yet — return empty so the chart shows "No data"
  return []
}

interface UseDashboardResult {
  metrics: DashboardMetrics | undefined
  chartData: ChartDataPoint[]
  isLoading: boolean
  error: Error | null
}

export function useDashboard(period: Period = '7d'): UseDashboardResult {
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery<DashboardMetrics, Error>({
    queryKey: ['dashboard', period],
    queryFn: () => fetchDashboardMetrics(period),
    staleTime: 1000 * 60 * 5,
  })

  const { data: chartData = [] } = useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard-chart', period],
    queryFn: () => fetchChartData(period),
    staleTime: 1000 * 60 * 5,
  })

  return {
    metrics,
    chartData,
    isLoading: metricsLoading,
    error: metricsError ?? null,
  }
}
