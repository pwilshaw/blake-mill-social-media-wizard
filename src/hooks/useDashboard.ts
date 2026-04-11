// T021 — Dashboard metrics hook
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
    throw new Error(error.message)
  }

  const snapshots = (data ?? []) as PerformanceSnapshot[]

  // Aggregate across all snapshots for the period
  const totalImpressions = snapshots.reduce((sum, s) => sum + s.total_impressions, 0)
  const totalClicks = snapshots.reduce((sum, s) => sum + s.total_clicks, 0)
  const totalSpend = snapshots.reduce((sum, s) => sum + s.total_spend, 0)
  const totalConversions = snapshots.reduce((sum, s) => sum + s.total_conversions, 0)
  const avgRoi =
    snapshots.length > 0
      ? snapshots.reduce((sum, s) => sum + s.roi, 0) / snapshots.length
      : 0

  // Count distinct active campaign IDs
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

interface UseDashboardResult {
  metrics: DashboardMetrics | undefined
  isLoading: boolean
  error: Error | null
}

export function useDashboard(period: Period = '7d'): UseDashboardResult {
  const { data: metrics, isLoading, error } = useQuery<DashboardMetrics, Error>({
    queryKey: ['dashboard', period],
    queryFn: () => fetchDashboardMetrics(period),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return { metrics, isLoading, error: error ?? null }
}
