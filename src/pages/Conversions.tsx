import { useState } from 'react'
import {
  BarChart3,
  ShoppingCart,
  MousePointerClick,
  ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/format'
import { PLATFORM_META } from '@/lib/platforms'
import type { AttributionModel, Platform } from '@/lib/types'

type ConversionTab = 'overview' | 'attribution' | 'funnel'

const DEMO_CONVERSIONS_OVER_TIME = [
  { date: 'Mon', purchases: 4, cart: 12, views: 85 },
  { date: 'Tue', purchases: 7, cart: 18, views: 102 },
  { date: 'Wed', purchases: 3, cart: 9, views: 74 },
  { date: 'Thu', purchases: 9, cart: 22, views: 118 },
  { date: 'Fri', purchases: 6, cart: 15, views: 96 },
  { date: 'Sat', purchases: 11, cart: 28, views: 145 },
  { date: 'Sun', purchases: 8, cart: 20, views: 130 },
]

const DEMO_CHANNEL_DATA: {
  channel: Platform
  conversions: number
  revenue: number
  spend: number
  roas: number
}[] = [
  { channel: 'google_ads', conversions: 52, revenue: 3120, spend: 760, roas: 4.1 },
  { channel: 'facebook', conversions: 48, revenue: 2880, spend: 900, roas: 3.2 },
  { channel: 'instagram', conversions: 35, revenue: 2100, spend: 750, roas: 2.8 },
  { channel: 'tiktok', conversions: 18, revenue: 1080, spend: 570, roas: 1.9 },
  { channel: 'snapchat', conversions: 8, revenue: 480, spend: 320, roas: 1.5 },
]

const FUNNEL_STEPS = [
  { label: 'Impressions', value: 24500, pct: 100 },
  { label: 'Clicks', value: 3200, pct: 13.1 },
  { label: 'Product Views', value: 1850, pct: 7.6 },
  { label: 'Add to Cart', value: 420, pct: 1.7 },
  { label: 'Purchases', value: 161, pct: 0.66 },
]

const ATTRIBUTION_MODELS: { value: AttributionModel; label: string }[] = [
  { value: 'last_touch', label: 'Last Touch' },
  { value: 'first_touch', label: 'First Touch' },
  { value: 'linear', label: 'Linear' },
  { value: 'time_decay', label: 'Time Decay' },
]

const RECENT_CONVERSIONS = [
  { product: 'Violet Haze Oxford', channel: 'Instagram', revenue: 65, time: '12 min ago' },
  { product: 'Midnight Blue Slim Fit', channel: 'Google Ads', revenue: 85, time: '28 min ago' },
  { product: 'Coral Reef Linen', channel: 'Facebook', revenue: 55, time: '1 hr ago' },
  { product: 'Classic White Formal', channel: 'Google Ads', revenue: 75, time: '1 hr ago' },
  { product: 'Sage Garden Casual', channel: 'Instagram', revenue: 60, time: '2 hrs ago' },
]

const CHANNEL_COLORS: Record<string, string> = {
  google_ads: '#22c55e',
  facebook: '#3b82f6',
  instagram: '#ec4899',
  tiktok: '#111827',
  snapchat: '#eab308',
}

export default function Conversions() {
  const [tab, setTab] = useState<ConversionTab>('overview')
  const [attributionModel, setAttributionModel] = useState<AttributionModel>('last_touch')

  const totalConversions = DEMO_CHANNEL_DATA.reduce((s, c) => s + c.conversions, 0)
  const totalRevenue = DEMO_CHANNEL_DATA.reduce((s, c) => s + c.revenue, 0)
  const totalSpend = DEMO_CHANNEL_DATA.reduce((s, c) => s + c.spend, 0)
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const conversionRate = (161 / 3200 * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2.5">
          <BarChart3 className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversions</h1>
          <p className="text-sm text-muted-foreground">
            Real-time tracking & multi-touch attribution
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ShoppingCart className="h-3.5 w-3.5" />
            Conversions
          </div>
          <p className="mt-1 text-2xl font-bold">{formatNumber(totalConversions)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Revenue
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            ROAS
          </div>
          <p className="mt-1 text-2xl font-bold">{overallRoas.toFixed(1)}x</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <MousePointerClick className="h-3.5 w-3.5" />
            Conv. Rate
          </div>
          <p className="mt-1 text-2xl font-bold">{conversionRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            CPA
          </div>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalSpend / totalConversions)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'attribution', label: 'Attribution' },
          { key: 'funnel', label: 'Funnel' },
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

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Conversions over time chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Conversions Over Time
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={DEMO_CONVERSIONS_OVER_TIME}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="purchases"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name="Purchases"
                  />
                  <Area
                    type="monotone"
                    dataKey="cart"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                    name="Add to Cart"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent conversions feed */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Live Conversion Feed</h2>
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Real-time
              </span>
            </div>
            <div className="space-y-2">
              {RECENT_CONVERSIONS.map((conv, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{conv.product}</p>
                      <p className="text-xs text-muted-foreground">
                        via {conv.channel} &middot; {conv.time}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                    +{formatCurrency(conv.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ATTRIBUTION TAB */}
      {tab === 'attribution' && (
        <div className="space-y-6">
          {/* Model selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Attribution Model:</span>
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {ATTRIBUTION_MODELS.map((model) => (
                <button
                  key={model.value}
                  onClick={() => setAttributionModel(model.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    attributionModel === model.value
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {model.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel attribution chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Revenue by Channel ({ATTRIBUTION_MODELS.find((m) => m.value === attributionModel)?.label})
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEMO_CHANNEL_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="channel"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: string) => PLATFORM_META[v as Platform]?.label ?? v}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label) => PLATFORM_META[String(label) as Platform]?.label ?? String(label)}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {DEMO_CHANNEL_DATA.map((entry) => (
                      <Cell
                        key={entry.channel}
                        fill={CHANNEL_COLORS[entry.channel] ?? '#6b7280'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Channel breakdown table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Channel</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Conversions</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Spend</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_CHANNEL_DATA.map((row) => {
                  const platform = PLATFORM_META[row.channel]
                  return (
                    <tr key={row.channel} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${platform.color} ${platform.bgColor}`}>
                          {platform.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.conversions}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.spend)}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold tabular-nums ${
                            row.roas >= 3 ? 'text-emerald-600' : row.roas >= 2 ? 'text-foreground' : 'text-red-500'
                          }`}
                        >
                          {row.roas.toFixed(1)}x
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FUNNEL TAB */}
      {tab === 'funnel' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-6 text-sm font-semibold text-foreground">
              Conversion Funnel (Last 7 Days)
            </h2>
            <div className="space-y-3 max-w-2xl mx-auto">
              {FUNNEL_STEPS.map((step, i) => {
                const widthPct = Math.max(step.pct, 8)
                const dropoff =
                  i > 0
                    ? (
                        ((FUNNEL_STEPS[i - 1].value - step.value) /
                          FUNNEL_STEPS[i - 1].value) *
                        100
                      ).toFixed(0)
                    : null
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{step.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold tabular-nums">
                          {formatNumber(step.value)}
                        </span>
                        {dropoff && (
                          <span className="text-xs text-red-500 tabular-nums">
                            -{dropoff}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-8 w-full rounded-lg bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-gradient-to-r from-primary to-primary/70 transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
