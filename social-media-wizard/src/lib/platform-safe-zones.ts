// Per-aspect-ratio safe zones. Values are fractions of the target frame's
// width (left/right) or height (top/bottom) that should be kept clear of
// design elements so that platform UI chrome doesn't obscure them.
//
// These are tuned for the most chrome-heavy placements per ratio:
// - 9:16  → Instagram Stories / TikTok (profile top, UI bottom)
// - 4:5   → Instagram feed (safe inside the 5% crop)
// - 16:9  → YouTube / FB link share (thumbnail letterboxing)
// - 1.91:1 → Facebook / LinkedIn link share card
// - 1:1   → any feed / carousel (minimal chrome)

import type { DesignAspectRatio } from './design-spec'

export interface SafeZone {
  top: number
  right: number
  bottom: number
  left: number
}

export const SAFE_ZONES: Record<DesignAspectRatio, SafeZone> = {
  '1:1': { top: 0.04, right: 0.04, bottom: 0.04, left: 0.04 },
  '4:5': { top: 0.06, right: 0.04, bottom: 0.06, left: 0.04 },
  '9:16': { top: 0.12, right: 0.04, bottom: 0.18, left: 0.04 },
  '16:9': { top: 0.06, right: 0.06, bottom: 0.06, left: 0.06 },
  '1.91:1': { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
}
