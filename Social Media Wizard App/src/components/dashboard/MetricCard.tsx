import { formatPercent } from '@/lib/format'
import { ArrowDown, ArrowUp } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

interface MetricCardProps {
  label: string
  value: string
  trend?: {
    change_pct: number
  }
  sparkline?: number[]
  accentColor?: string
}

export function MetricCard({
  label,
  value,
  trend,
  sparkline,
  accentColor = '#3b82f6',
}: MetricCardProps) {
  const isPositive = trend && trend.change_pct >= 0
  const trendColor = isPositive ? 'text-emerald-600' : 'text-red-500'
  const trendBg = isPositive ? 'bg-emerald-50' : 'bg-red-50'

  const sparkData = sparkline?.map((v, i) => ({ i, v }))

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 ${trendBg}`}
          >
            {isPositive ? (
              <ArrowUp className={`h-3 w-3 ${trendColor}`} />
            ) : (
              <ArrowDown className={`h-3 w-3 ${trendColor}`} />
            )}
            <span className={`text-xs font-semibold ${trendColor}`}>
              {formatPercent(trend.change_pct)}
            </span>
          </div>
        )}
      </div>

      {sparkData && sparkData.length > 1 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={accentColor}
                fill={accentColor}
                fillOpacity={0.1}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
