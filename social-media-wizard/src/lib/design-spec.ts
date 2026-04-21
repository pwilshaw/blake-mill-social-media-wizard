// Design template spec — canonical 1x1 canvas resolved per aspect ratio.
// Shared between the editor, the preview strip, and the server renderer.

import { SAFE_ZONES } from './platform-safe-zones'

export type DesignAspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1'

export const ALL_RATIOS: DesignAspectRatio[] = ['1:1', '4:5', '9:16', '16:9', '1.91:1']

export const RATIO_DIMENSIONS: Record<DesignAspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1.91:1': { width: 1200, height: 628 },
}

export type AlignH = 'left' | 'center' | 'right'
export type AlignV = 'top' | 'middle' | 'bottom'

export type ColorKey =
  | 'primary'
  | 'secondary'
  | 'foreground'
  | 'background'
  | 'neutral-white'
  | 'neutral-black'
  | 'neutral-dim'

export type LayerKind = 'title' | 'subtitle' | 'cta' | 'logo' | 'chip'

export interface DesignLayer {
  id: string
  kind: LayerKind
  // Position and size as fractions (0..1) of the content box.
  x: number
  y: number
  w: number
  h: number
  rotation: number // degrees
  opacity: number // 0..1
  align_h: AlignH
  align_v: AlignV
  // Text-only.
  content?: string // may contain {product_name}, {price}, {cta}
  weight?: 'regular' | 'bold'
  size_pct?: number // % of content-box height (e.g. 6 = 6%)
  color_key?: ColorKey
  bg_color_key?: ColorKey
  padding_pct?: number // % of content-box height, for cta / chip backgrounds
  radius_pct?: number // % of layer height
  // Logo-only.
  src_key?: 'brand_square' | 'brand_wide'
  hidden?: boolean
}

export interface DesignSpec {
  background: {
    type: 'product_photo' | 'solid'
    color_key?: ColorKey
    fit?: 'cover' | 'contain'
  }
  layers: DesignLayer[]
}

export interface BrandPalette {
  primary: string
  secondary: string
  foreground: string
  background: string
  square_logo_url?: string | null
  wide_logo_url?: string | null
}

export const DEFAULT_PALETTE: BrandPalette = {
  primary: '#1a1a2e',
  secondary: '#e2e8f0',
  foreground: '#0f172a',
  background: '#ffffff',
  square_logo_url: null,
  wide_logo_url: null,
}

export function resolveColor(key: ColorKey | undefined, palette: BrandPalette): string {
  switch (key) {
    case 'primary':
      return palette.primary
    case 'secondary':
      return palette.secondary
    case 'foreground':
      return palette.foreground
    case 'background':
      return palette.background
    case 'neutral-white':
      return '#ffffff'
    case 'neutral-black':
      return '#000000'
    case 'neutral-dim':
      return 'rgba(0,0,0,0.55)'
    default:
      return palette.foreground
  }
}

export interface ResolvedBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ResolvedLayer {
  id: string
  kind: LayerKind
  // Absolute px within the target frame.
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  align_h: AlignH
  align_v: AlignV
  content?: string
  weight?: 'regular' | 'bold'
  font_size_px: number
  color?: string
  bg_color?: string
  padding_px: number
  radius_px: number
  src_url?: string | null
  hidden: boolean
}

/**
 * Compute the centred, safe-zone-adjusted square "content box" inside a
 * non-square target frame. The content box is where layers live. The
 * background image fills the whole frame ignoring this box.
 */
export function computeContentBox(ratio: DesignAspectRatio): ResolvedBox {
  const { width, height } = RATIO_DIMENSIONS[ratio]
  const safe = SAFE_ZONES[ratio]
  // The content box is the largest centred square that fits within the safe area.
  const safeW = width * (1 - safe.left - safe.right)
  const safeH = height * (1 - safe.top - safe.bottom)
  const size = Math.min(safeW, safeH)
  const x = safe.left * width + (safeW - size) / 2
  const y = safe.top * height + (safeH - size) / 2
  return { x, y, w: size, h: size }
}

function substituteContent(
  raw: string | undefined,
  vars: Record<string, string | number | null | undefined>,
): string {
  if (!raw) return ''
  return raw.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key]
    return v === null || v === undefined ? '' : String(v)
  })
}

export interface ResolveOpts {
  ratio: DesignAspectRatio
  palette: BrandPalette
  vars?: Record<string, string | number | null | undefined>
}

export function resolveLayers(spec: DesignSpec, opts: ResolveOpts): ResolvedLayer[] {
  const { ratio, palette, vars } = opts
  const box = computeContentBox(ratio)

  return spec.layers
    .filter((l) => !l.hidden)
    .map<ResolvedLayer>((l) => {
      // x/y is the layer's top-left as a fraction of the content box.
      // align_h/align_v control how the layer's *contents* align inside its box.
      const w = l.w * box.w
      const h = l.h * box.h
      const x = box.x + l.x * box.w
      const y = box.y + l.y * box.h

      const font_size_px = Math.round(((l.size_pct ?? 6) / 100) * box.h)
      const padding_px = Math.round(((l.padding_pct ?? 0) / 100) * box.h)
      const radius_px = Math.round(((l.radius_pct ?? 0) / 100) * h)

      const src_url =
        l.kind === 'logo'
          ? l.src_key === 'brand_wide'
            ? palette.wide_logo_url ?? palette.square_logo_url ?? null
            : palette.square_logo_url ?? palette.wide_logo_url ?? null
          : null

      return {
        id: l.id,
        kind: l.kind,
        x,
        y,
        w,
        h,
        rotation: l.rotation,
        opacity: l.opacity,
        align_h: l.align_h,
        align_v: l.align_v,
        content: substituteContent(l.content, vars ?? {}),
        weight: l.weight,
        font_size_px,
        color: resolveColor(l.color_key, palette),
        bg_color: l.bg_color_key ? resolveColor(l.bg_color_key, palette) : undefined,
        padding_px,
        radius_px,
        src_url,
        hidden: false,
      }
    })
}

/** Minimal empty template used when the user starts from scratch. */
export function emptyDesignSpec(): DesignSpec {
  return {
    background: { type: 'product_photo', fit: 'cover' },
    layers: [],
  }
}

export function cloneSpec(spec: DesignSpec): DesignSpec {
  return JSON.parse(JSON.stringify(spec)) as DesignSpec
}

export function newLayerId(): string {
  // Avoid Node-only crypto dependency in the browser.
  return `l_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}
