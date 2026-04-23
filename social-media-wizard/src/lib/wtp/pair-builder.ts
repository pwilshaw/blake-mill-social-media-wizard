// Random-draw pair builder for the WTP conjoint study.
//
// Each pair samples one price per option from the user's 3 price points and
// one feature-bit-vector per option (each feature independently included or
// not with 50% probability). The two options must differ — if a draw collides
// it's re-rolled. `first_shown` is randomised so each pair's display order is
// independent of its id — this prevents position bias.

import type { WtpConfig, WtpPairOption } from '@/lib/types'

export interface GeneratedPair {
  pair_id: string
  option_1: WtpPairOption
  option_2: WtpPairOption
  first_shown: 1 | 2
}

function randomChoice<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]
}

function randomFeatures(ids: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const id of ids) out[id] = Math.random() < 0.5
  return out
}

function sameOption(a: WtpPairOption, b: WtpPairOption): boolean {
  if (a.price !== b.price) return false
  const keys = Object.keys(a.features)
  return keys.every((k) => a.features[k] === b.features[k])
}

function shortId(): string {
  return `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function buildPair(config: WtpConfig): GeneratedPair {
  const featureIds = config.features.map((f) => f.id)
  let option_1: WtpPairOption
  let option_2: WtpPairOption
  let attempts = 0
  do {
    option_1 = { price: randomChoice(config.price_points), features: randomFeatures(featureIds) }
    option_2 = { price: randomChoice(config.price_points), features: randomFeatures(featureIds) }
    attempts += 1
    if (attempts > 20) break // give up and accept near-duplicate
  } while (sameOption(option_1, option_2))

  return {
    pair_id: shortId(),
    option_1,
    option_2,
    first_shown: Math.random() < 0.5 ? 1 : 2,
  }
}

export function buildPairs(config: WtpConfig, count: number): GeneratedPair[] {
  return Array.from({ length: count }, () => buildPair(config))
}
