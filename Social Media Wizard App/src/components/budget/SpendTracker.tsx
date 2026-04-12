// T061 — Spend Tracker
// Visualises current spend vs limit per budget rule, with alert indicators
// and a historical spend line chart via recharts.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { BudgetRule, SpendLog } from '@/lib/types'

interface Props {
  rules: BudgetRule[]
  spendLogs: SpendLog[]
}

function formatGbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Aggregate spend logs into a day-by-day series for the chart.
function buildChartData(
  logs: SpendLog[]
): { date: string; spend: number }[] {
  const byDay = new Map<string, number>()

  for (const log of logs) {
    const day = log.logged_at.slice(0, 10) // "YYYY-MM-DD"
    byDay.set(day, (byDay.get(day) ?? 0) + log.amount)
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend]) => ({ date: formatDate(date), spend }))
}

function ruleScopeLabel(rule: BudgetRule): string {
  if (rule.scope === 'global') return 'Global'
  if (rule.scope === 'channel') return `Channel (${rule.channel_account_id?.slice(0, 8) ?? '—'})`
  return `Campaign (${rule.campaign_id?.slice(0, 8) ?? '—'})`
}

function SpendProgressBar({ rule }: { rule: BudgetRule }) {
  const pct = Math.min((rule.current_spend / rule.limit_amount) * 100, 100)
  const isAlert = pct >= rule.alert_threshold_pct
  const isExceeded = pct >= 100

  const trackColor = isExceeded
    ? 'bg-destructive/20'
    : isAlert
      ? 'bg-yellow-500/20'
      : 'bg-muted'

  const fillColor = isExceeded
    ? 'bg-destructive'
    : isAlert
      ? 'bg-yellow-500'
      : 'bg-primary'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate text-sm font-medium text-foreground">
            {ruleScopeLabel(rule)}
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
            {rule.period}
          </span>
          {isAlert && !isExceeded && (
            <span
              className="shrink-0 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400"
              role="status"
              aria-label="Alert threshold reached"
            >
              Alert
            </span>
          )}
          {isExceeded && (
            <span
              className="shrink-0 rounded-full bg-destructive/20 px-2 py-0.5 text-xs font-medium text-destructive"
              role="status"
              aria-label="Budget exceeded"
            >
              Exceeded
            </span>
          )}
        </div>
        <span className="shrink-0 tabular-nums text-sm text-muted-foreground">
          {formatGbp(rule.current_spend)} / {formatGbp(rule.limit_amount)}
        </span>
      </div>

      <div
        className={`h-2 w-full overflow-hidden rounded-full ${trackColor}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${ruleScopeLabel(rule)} spend ${pct.toFixed(0)}%`}
      >
        <div
          className={`h-full rounded-full transition-all ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {pct.toFixed(1)}% used · alert at {rule.alert_threshold_pct}%
        {rule.auto_pause && ' · auto-pause enabled'}
      </p>
    </div>
  )
}

export function SpendTracker({ rules, spendLogs }: Props) {
  const chartData = buildChartData(spendLogs)
  const hasLogs = chartData.length > 0

  return (
    <div className="space-y-8">
      {/* Per-rule progress bars */}
      <section aria-labelledby="spend-tracker-heading">
        <h2 id="spend-tracker-heading" className="mb-4 text-sm font-semibold text-foreground">
          Current Period Spend
        </h2>

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No budget rules configured.</p>
        ) : (
          <div className="space-y-6">
            {rules.map((rule) => (
              <SpendProgressBar key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </section>

      {/* Historical spend chart */}
      <section aria-labelledby="spend-history-heading">
        <h2 id="spend-history-heading" className="mb-4 text-sm font-semibold text-foreground">
          Historical Spend
        </h2>

        {!hasLogs ? (
          <p className="text-sm text-muted-foreground">No spend data recorded yet.</p>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => `£${v}`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  formatter={(value) => [formatGbp(Number(value ?? 0)), 'Spend']}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="spend"
                  name="Daily spend"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
