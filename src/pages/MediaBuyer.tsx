import { useState } from 'react'
import {
  Bot,
  TrendingUp,
  Pause,
  Play,
  Settings2,
  ArrowUpRight,
  Users,
  DollarSign,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { PLATFORM_META } from '@/lib/platforms'
import type { OptimizationGoal, Platform } from '@/lib/types'

type BuyerTab = 'actions' | 'settings' | 'history'

interface DemoAction {
  id: string
  type: 'bid_adjustment' | 'audience_expansion' | 'budget_reallocation' | 'pause_underperformer'
  description: string
  impact: string
  channel: Platform
  status: 'pending' | 'applied' | 'dismissed'
  created: string
}

const DEMO_ACTIONS: DemoAction[] = [
  {
    id: '1',
    type: 'bid_adjustment',
    description: 'Increase bid by 15% on Instagram Story ads — CTR is 2.3x above average',
    impact: '+18% estimated conversions',
    channel: 'instagram',
    status: 'pending',
    created: '2 min ago',
  },
  {
    id: '2',
    type: 'audience_expansion',
    description: 'Expand Facebook lookalike audience from 1% to 2% — current audience is saturating',
    impact: '+40% reach, est. +12 conversions/week',
    channel: 'facebook',
    status: 'pending',
    created: '15 min ago',
  },
  {
    id: '3',
    type: 'budget_reallocation',
    description: 'Shift £50/day from TikTok (0.8x ROAS) to Google Ads (4.1x ROAS)',
    impact: '+£205 estimated weekly revenue',
    channel: 'google_ads',
    status: 'pending',
    created: '1 hr ago',
  },
  {
    id: '4',
    type: 'pause_underperformer',
    description: 'Pause "Spring Casual" ad set on Snapchat — 0 conversions after £45 spend',
    impact: 'Save £45/day budget waste',
    channel: 'snapchat',
    status: 'applied',
    created: '3 hrs ago',
  },
]

const GOAL_OPTIONS: { value: OptimizationGoal; label: string; description: string }[] = [
  { value: 'roas', label: 'Maximise ROAS', description: 'Optimise for return on ad spend' },
  { value: 'cpa', label: 'Minimise CPA', description: 'Lowest cost per acquisition' },
  { value: 'conversions', label: 'Max Conversions', description: 'Most conversions within budget' },
  { value: 'ctr', label: 'Max CTR', description: 'Highest click-through rate' },
]

const ACTION_ICONS = {
  bid_adjustment: TrendingUp,
  audience_expansion: Users,
  budget_reallocation: DollarSign,
  pause_underperformer: Pause,
}

export default function MediaBuyer() {
  const [tab, setTab] = useState<BuyerTab>('actions')
  const [isActive, setIsActive] = useState(true)
  const [goal, setGoal] = useState<OptimizationGoal>('roas')
  const [actions, setActions] = useState(DEMO_ACTIONS)
  const [autoBids, setAutoBids] = useState(true)
  const [autoAudiences, setAutoAudiences] = useState(false)
  const [autoBudget, setAutoBudget] = useState(true)

  function applyAction(id: string) {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'applied' as const } : a))
    )
  }

  function dismissAction(id: string) {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'dismissed' as const } : a))
    )
  }

  const pendingCount = actions.filter((a) => a.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2.5">
            <Bot className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Media Buyer</h1>
            <p className="text-sm text-muted-foreground">
              24/7 automated optimization across all channels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
              }`}
            />
            {isActive ? 'Active' : 'Paused'}
          </span>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'border border-border text-muted-foreground hover:bg-muted'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Activate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Optimizations Today
          </p>
          <p className="mt-1 text-2xl font-bold">12</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Savings This Week
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(342)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            ROAS Lift
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">+0.8x</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pending Actions
          </p>
          <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'actions', label: `Actions${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'settings', label: 'Settings' },
          { key: 'history', label: 'History' },
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

      {/* ACTIONS TAB */}
      {tab === 'actions' && (
        <div className="space-y-3">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.type]
            const platform = PLATFORM_META[action.channel]
            return (
              <div
                key={action.id}
                className={`rounded-xl border bg-card p-4 transition-opacity ${
                  action.status === 'dismissed' ? 'opacity-40 border-border' : 'border-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-violet-50 p-2 shrink-0">
                    <Icon className="h-4 w-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${platform.color} ${platform.bgColor}`}
                      >
                        {platform.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{action.created}</span>
                    </div>
                    <p className="text-sm text-foreground">{action.description}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <ArrowUpRight className="h-3 w-3" />
                      {action.impact}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {action.status === 'pending' && (
                      <>
                        <button
                          onClick={() => applyAction(action.id)}
                          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Apply
                        </button>
                        <button
                          onClick={() => dismissAction(action.id)}
                          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Dismiss
                        </button>
                      </>
                    )}
                    {action.status === 'applied' && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Applied
                      </span>
                    )}
                    {action.status === 'dismissed' && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" />
                        Dismissed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === 'settings' && (
        <div className="max-w-xl space-y-6">
          {/* Optimization goal */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Optimization Goal
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    goal === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Automation toggles */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automation Controls
            </h3>
            {[
              {
                label: 'Auto-adjust bids',
                description: 'Automatically raise or lower bids based on performance',
                checked: autoBids,
                onChange: setAutoBids,
              },
              {
                label: 'Auto-expand audiences',
                description: 'Widen targeting when current audience saturates',
                checked: autoAudiences,
                onChange: setAutoAudiences,
              },
              {
                label: 'Auto-reallocate budget',
                description: 'Move budget from underperforming to top channels',
                checked: autoBudget,
                onChange: setAutoBudget,
              },
            ].map((toggle) => (
              <label
                key={toggle.label}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{toggle.label}</p>
                  <p className="text-xs text-muted-foreground">{toggle.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={toggle.checked}
                  onClick={() => toggle.onChange(!toggle.checked)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                    toggle.checked ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      toggle.checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-2">
          {[
            { time: '11:42', action: 'Bid increased 12% on Instagram — high CTR detected', status: 'applied' },
            { time: '10:15', action: 'Budget shifted £30 from Snapchat to Facebook', status: 'applied' },
            { time: '09:30', action: 'Audience expanded on Google Ads (1% → 1.5%)', status: 'applied' },
            { time: '08:00', action: 'Daily performance scan completed — all channels healthy', status: 'info' },
            { time: 'Yesterday', action: 'Paused underperforming ad set "Weekend Linen"', status: 'applied' },
            { time: 'Yesterday', action: 'Bid decreased 8% on TikTok — below CPA target', status: 'applied' },
          ].map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0 tabular-nums">
                {entry.time}
              </span>
              <p className="text-sm text-foreground flex-1">{entry.action}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  entry.status === 'applied'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {entry.status === 'applied' ? 'Applied' : 'Info'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
