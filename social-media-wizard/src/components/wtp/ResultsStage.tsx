import { Download, RotateCcw } from 'lucide-react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts'
import { downloadCsv } from '@/lib/wtp/csv'
import type { WtpStudy, WtpResponse } from '@/lib/types'

interface Props {
  study: WtpStudy
  onNewStudy: () => void
}

export function ResultsStage({ study, onNewStudy }: Props) {
  const { results, responses, config, name, persona_key } = study
  if (!results) return null

  const chartData = results.by_feature.map((f) => ({
    feature: f.label,
    wtp: f.wtp_gbp ?? 0,
    uplift: Number(f.uplift_pp.toFixed(2)),
    noWtp: f.wtp_gbp === null,
  }))

  const priceChartData = results.by_price.map((p) => ({
    price: `£${p.price}`,
    rate: Number(p.purchase_rate.toFixed(1)),
  }))

  function handleExport() {
    const rows = responses.map((r: WtpResponse) => ({
      pair_id: r.pair_id,
      first_shown: r.first_shown,
      option_1_price: r.option_1.price,
      option_1_features: JSON.stringify(r.option_1.features),
      option_2_price: r.option_2.price,
      option_2_features: JSON.stringify(r.option_2.features),
      choice: r.claude_choice,
      reason: r.reason ?? '',
      ms: r.ms,
      raw_text: r.raw_text,
    }))
    const safe = name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
    downloadCsv(`wtp-${safe}-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Results</h2>
          <p className="text-xs text-muted-foreground">
            {results.n_responses} usable responses · persona: <span className="font-medium">{persona_key}</span>
            {results.n_failed > 0 && (
              <span className="ml-2 text-destructive">{results.n_failed} failed</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={onNewStudy}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New study
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Purchase rate"
          value={`${results.purchase_rate.toFixed(1)}%`}
          hint={`${Math.round((results.purchase_rate / 100) * results.n_responses)} of ${results.n_responses} chose a paid option`}
        />
        <SummaryCard
          label="Outside option"
          value={`${results.outside_rate.toFixed(1)}%`}
          hint="declined both paid options"
        />
        <SummaryCard
          label="Price sensitivity"
          value={`${results.price_elasticity_pct_per_pound.toFixed(2)} pp / £`}
          hint={
            results.price_elasticity_pct_per_pound < 0
              ? 'purchase rate falls as price rises'
              : 'weak or inverted signal'
          }
        />
      </div>

      {/* WTP by feature */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Estimated WTP per feature</h3>
        <p className="text-xs text-muted-foreground">
          £/mo a simulated buyer would accept to add the feature. Derived from how often adding the feature shifted the choice across all considered pairs, scaled by the observed price sensitivity.
        </p>
        <div style={{ width: '100%', height: 48 + chartData.length * 44 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 48, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => `£${v.toFixed(0)}`} fontSize={12} />
              <YAxis type="category" dataKey="feature" width={140} fontSize={12} />
              <Tooltip
                formatter={(value) => {
                  const n = Number(value)
                  return [Number.isFinite(n) ? `£${n.toFixed(2)}` : '—', 'WTP (£/mo)']
                }}
                labelFormatter={(l) => `Feature: ${l}`}
              />
              <Bar dataKey="wtp" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.noWtp ? '#94a3b8' : '#6366f1'} />
                ))}
                <LabelList
                  dataKey="wtp"
                  position="right"
                  formatter={(value: unknown) => {
                    const n = Number(value)
                    return Number.isFinite(n) ? `£${n.toFixed(2)}` : ''
                  }}
                  style={{ fontSize: 11, fill: 'currentColor' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {results.price_elasticity_pct_per_pound >= 0 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
            Price sensitivity is flat or inverted — WTP numbers are unreliable. Try more responses, or widen the price range.
          </p>
        )}
      </div>

      {/* Price × purchase rate */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Purchase rate by price</h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={priceChartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="price" fontSize={12} />
              <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
              <Tooltip
                formatter={(value) => {
                  const n = Number(value)
                  return [Number.isFinite(n) ? `${n.toFixed(1)}%` : '—', 'Purchase rate']
                }}
              />
              <Bar dataKey="rate" fill="#22c55e" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="rate"
                  position="top"
                  formatter={(value: unknown) => {
                    const n = Number(value)
                    return Number.isFinite(n) ? `${n.toFixed(1)}%` : ''
                  }}
                  style={{ fontSize: 11, fill: 'currentColor' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw responses — collapsible */}
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted/30">
          Raw responses ({responses.length})
        </summary>
        <div className="max-h-96 overflow-y-auto border-t border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Opt 1 (£)</th>
                <th className="px-3 py-2 text-left font-semibold">Opt 2 (£)</th>
                <th className="px-3 py-2 text-left font-semibold">Choice</th>
                <th className="px-3 py-2 text-left font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r, i) => (
                <tr key={r.pair_id} className="border-t border-border">
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-1.5 tabular-nums">£{r.option_1.price}</td>
                  <td className="px-3 py-1.5 tabular-nums">£{r.option_2.price}</td>
                  <td className="px-3 py-1.5 font-medium">{r.claude_choice}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Config recap */}
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted/30">
          Study config
        </summary>
        <div className="border-t border-border p-5 space-y-2 text-xs">
          <div><span className="text-muted-foreground">Product:</span> {config.product_name}</div>
          <div><span className="text-muted-foreground">Prices:</span> £{config.price_points.join(' / £')}</div>
          <div><span className="text-muted-foreground">Features:</span> {config.features.map((f) => f.label).join(', ')}</div>
          <div><span className="text-muted-foreground">Responses:</span> {config.responses_per_set}</div>
        </div>
      </details>
    </div>
  )
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  )
}
