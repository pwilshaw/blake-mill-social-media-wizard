// Frequency-based WTP calculation for the WTP conjoint study.
//
// Given N simulated responses, compute:
//  - overall purchase rate (% who chose either paid option)
//  - per-price purchase rate (for linear elasticity)
//  - per-feature uplift: P(purchase | feature present) − P(purchase | feature absent)
//  - estimated £/mo WTP = feature_uplift_pct / price_elasticity_pct_per_pound
//
// Caveats documented in the plan's "Out of scope" section.

import type { WtpConfig, WtpResponse, WtpResults, WtpPairOption } from '@/lib/types'

function chosenOption(r: WtpResponse): WtpPairOption | null {
  if (r.claude_choice === 'option_1') return r.option_1
  if (r.claude_choice === 'option_2') return r.option_2
  return null
}

function shownOption(r: WtpResponse, slot: 'option_1' | 'option_2'): WtpPairOption {
  return slot === 'option_1' ? r.option_1 : r.option_2
}

/** Linear regression slope of y on x. Returns 0 for ≤1 data points. */
function slope(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0
  const n = points.length
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

export function computeWtp(config: WtpConfig, responses: WtpResponse[]): WtpResults {
  const usable = responses.filter((r) => r.claude_choice !== 'parse_error')
  const n = usable.length
  const n_failed = responses.length - n

  if (n === 0) {
    return {
      n_responses: 0,
      n_failed,
      purchase_rate: 0,
      outside_rate: 0,
      by_price: config.price_points.map((p) => ({ price: p, purchase_rate: 0 })),
      by_feature: config.features.map((f) => ({ id: f.id, label: f.label, uplift_pp: 0, wtp_gbp: null })),
      price_elasticity_pct_per_pound: 0,
    }
  }

  // Overall purchase rate
  const purchased = usable.filter((r) => r.claude_choice !== 'outside').length
  const purchase_rate = (purchased / n) * 100
  const outside_rate = 100 - purchase_rate

  // Per-price purchase rate: for each price point, % of responses where the
  // chosen option was priced at that level. When the user chose outside,
  // neither option counts toward purchases at any price — this is the standard
  // discrete-choice treatment.
  const by_price = config.price_points.map((price) => {
    // Denominator: responses where at least one option was offered at this price
    // (always true for all prices across the study, but we keep the shape
    // general). Numerator: chose an option at this price.
    const denom = usable.filter(
      (r) => r.option_1.price === price || r.option_2.price === price,
    ).length
    const numer = usable.filter((r) => {
      const c = chosenOption(r)
      return c !== null && c.price === price
    }).length
    const rate = denom > 0 ? (numer / denom) * 100 : 0
    return { price, purchase_rate: rate }
  })

  // Price elasticity: linear slope of purchase_rate on price (pct per £).
  // Negative slope means purchase rate falls as price rises.
  const elastSlope = slope(by_price.map((p) => ({ x: p.price, y: p.purchase_rate })))
  const price_elasticity_pct_per_pound = elastSlope

  // Per-feature uplift. We consider each shown option separately (both option_1
  // and option_2 appear in every response), so "P(purchase | feature present)"
  // is: across all option-slots where the feature was present, what fraction
  // of those options were the CHOSEN option? Likewise for absent. The
  // difference is the uplift attributable to including the feature.
  const by_feature = config.features.map((f) => {
    let presentTotal = 0, presentChosen = 0
    let absentTotal = 0, absentChosen = 0
    for (const r of usable) {
      for (const slot of ['option_1', 'option_2'] as const) {
        const opt = shownOption(r, slot)
        const has = opt.features[f.id] === true
        const chosen = r.claude_choice === slot
        if (has) {
          presentTotal += 1
          if (chosen) presentChosen += 1
        } else {
          absentTotal += 1
          if (chosen) absentChosen += 1
        }
      }
    }
    const presentRate = presentTotal > 0 ? (presentChosen / presentTotal) * 100 : 0
    const absentRate = absentTotal > 0 ? (absentChosen / absentTotal) * 100 : 0
    const uplift_pp = presentRate - absentRate
    // WTP = uplift in purchase-rate points / price-sensitivity (points per £).
    // Only valid when price_elasticity is negative (rising price → falling
    // purchase rate). If the slope is ≥ 0, the signal is too noisy or wrong
    // direction, so we report null.
    let wtp_gbp: number | null = null
    if (price_elasticity_pct_per_pound < 0 && uplift_pp > 0) {
      wtp_gbp = uplift_pp / Math.abs(price_elasticity_pct_per_pound)
    } else if (price_elasticity_pct_per_pound < 0 && uplift_pp <= 0) {
      wtp_gbp = 0
    }
    return { id: f.id, label: f.label, uplift_pp, wtp_gbp }
  })

  return {
    n_responses: n,
    n_failed,
    purchase_rate,
    outside_rate,
    by_price,
    by_feature,
    price_elasticity_pct_per_pound,
  }
}
