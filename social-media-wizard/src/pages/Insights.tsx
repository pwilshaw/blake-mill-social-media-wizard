import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, RefreshCw } from 'lucide-react'
import { fetchInsights } from '@/lib/insights-api'
import type { InsightsResponse } from '@/lib/insights-api'

const WINDOW_OPTIONS: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '365 days', days: 365 },
]

export default function Insights() {
  const [days, setDays] = useState(90)

  const query = useQuery<InsightsResponse, Error>({
    queryKey: ['insights', days],
    queryFn: () => fetchInsights(days),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Post insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Claude-narrated analysis of your published posts, plus the numbers behind it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-md border border-border p-0.5">
            {WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  days === opt.days
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${query.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {query.isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {query.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {query.error.message}
        </div>
      )}

      {query.data && <InsightsBody data={query.data} />}
    </div>
  )
}

function InsightsBody({ data }: { data: InsightsResponse }) {
  const { analysis, by_platform, by_day_of_week, organic_paid, by_angle, top_posts, total_posts, days } = data

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Narrative</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {total_posts} post{total_posts === 1 ? '' : 's'} · last {days} days
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {analysis}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <OrganicPaidCard split={organic_paid} />
        <ByDayCard days={by_day_of_week} />
      </div>

      <ByPlatformTable rows={by_platform} />

      {by_angle.length > 0 && <ByAngleCard rows={by_angle} />}

      <TopPostsList posts={top_posts} />
    </div>
  )
}

function OrganicPaidCard({ split }: { split: InsightsResponse['organic_paid'] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Organic vs Paid</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">Organic</p>
          <p className="text-lg font-bold tabular-nums mt-1">{split.organic_posts} posts</p>
          <p className="text-xs text-muted-foreground">{split.organic_impressions.toLocaleString()} impressions</p>
          <p className="text-xs text-muted-foreground">{split.organic_engagement_rate.toFixed(2)}% eng. rate</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Paid</p>
          <p className="text-lg font-bold tabular-nums mt-1">{split.paid_posts} posts</p>
          <p className="text-xs text-muted-foreground">{split.paid_impressions.toLocaleString()} impressions</p>
          <p className="text-xs text-muted-foreground">£{split.paid_spend.toFixed(2)} · {split.paid_engagement_rate.toFixed(2)}% eng. rate</p>
        </div>
      </div>
    </div>
  )
}

function ByDayCard({ days }: { days: InsightsResponse['by_day_of_week'] }) {
  const maxRate = Math.max(1, ...days.map((d) => d.engagement_rate))
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Engagement by day</h2>
      <div className="flex items-end gap-1.5 h-24">
        {days.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-primary/20 transition-all"
              style={{ height: `${Math.max(3, (d.engagement_rate / maxRate) * 100)}%` }}
              title={`${d.day}: ${d.engagement_rate.toFixed(2)}% over ${d.posts} posts`}
            />
            <span className="text-[10px] text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ByPlatformTable({ rows }: { rows: InsightsResponse['by_platform'] }) {
  if (rows.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-foreground">By platform</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-5 py-2 text-left font-semibold">Platform</th>
              <th className="px-3 py-2 text-right font-semibold">Posts</th>
              <th className="px-3 py-2 text-right font-semibold">Impressions</th>
              <th className="px-3 py-2 text-right font-semibold">Clicks</th>
              <th className="px-3 py-2 text-right font-semibold">CTR %</th>
              <th className="px-3 py-2 text-right font-semibold">Eng. %</th>
              <th className="px-5 py-2 text-right font-semibold">Spend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.platform} className="border-t border-border">
                <td className="px-5 py-2 font-medium capitalize">{r.platform}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.posts}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.ctr.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.engagement_rate.toFixed(2)}</td>
                <td className="px-5 py-2 text-right tabular-nums">£{r.spend.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ByAngleCard({ rows }: { rows: InsightsResponse['by_angle'] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Editorial angle performance</h2>
      <p className="text-xs text-muted-foreground">Average engagement rate per angle preset across all posts in the window.</p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.angle} className="flex items-center gap-3">
            <span className="w-24 text-xs font-medium text-foreground capitalize">{r.angle}</span>
            <div className="flex-1 relative h-5 rounded bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary/30"
                style={{ width: `${Math.min(100, r.avg_engagement_rate * 10)}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] tabular-nums">
                {r.avg_engagement_rate.toFixed(2)}% · {r.posts} post{r.posts === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopPostsList({ posts }: { posts: InsightsResponse['top_posts'] }) {
  if (posts.length === 0) return null
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Top 5 posts by engagement rate</h2>
      <div className="space-y-2">
        {posts.map((p, i) => (
          <div key={p.id} className="rounded-lg border border-border p-3 flex items-start gap-3">
            <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="capitalize font-medium">{p.platform}</span>
                {p.published_at && (
                  <span>· {new Date(p.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                )}
                <span>· {p.impressions.toLocaleString()} impressions</span>
                <span className="ml-auto font-semibold text-foreground">{p.engagement_rate.toFixed(2)}%</span>
              </div>
              <p className="text-sm text-foreground line-clamp-2">{p.copy}</p>
              {p.cta && <p className="text-[11px] text-primary">CTA: {p.cta}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
