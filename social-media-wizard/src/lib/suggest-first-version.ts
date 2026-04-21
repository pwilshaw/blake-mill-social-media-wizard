import type { BrandPalette, DesignSpec } from './design-spec'
import { newLayerId } from './design-spec'

interface SuggestInput {
  product_name?: string | null
  price?: number | null
  palette: BrandPalette
}

/**
 * Produce an opinionated starter template: logo top-left, price chip top-right,
 * title block bottom-left, CTA pill bottom-right. All coordinates are the
 * layer's top-left as a fraction of the canonical 1x1 content box.
 */
export function suggestFirstVersion(input: SuggestInput): DesignSpec {
  const hasLogo = Boolean(input.palette.square_logo_url || input.palette.wide_logo_url)

  const layers: DesignSpec['layers'] = []

  if (hasLogo) {
    layers.push({
      id: newLayerId(),
      kind: 'logo',
      x: 0.04,
      y: 0.04,
      w: 0.18,
      h: 0.18,
      rotation: 0,
      opacity: 1,
      align_h: 'center',
      align_v: 'middle',
      src_key: 'brand_square',
    })
  }

  layers.push({
    id: newLayerId(),
    kind: 'chip',
    x: 0.74,
    y: 0.06,
    w: 0.22,
    h: 0.08,
    rotation: 0,
    opacity: 1,
    align_h: 'center',
    align_v: 'middle',
    content: input.price != null ? `£${input.price.toFixed(0)}` : 'New',
    weight: 'bold',
    size_pct: 4.5,
    color_key: 'background',
    bg_color_key: 'primary',
    padding_pct: 1.2,
    radius_pct: 50,
  })

  layers.push({
    id: newLayerId(),
    kind: 'title',
    x: 0.04,
    y: 0.72,
    w: 0.62,
    h: 0.14,
    rotation: 0,
    opacity: 1,
    align_h: 'left',
    align_v: 'middle',
    content: input.product_name?.toUpperCase() ?? '{product_name}',
    weight: 'bold',
    size_pct: 7,
    color_key: 'background',
    bg_color_key: 'primary',
    padding_pct: 1.5,
    radius_pct: 8,
  })

  layers.push({
    id: newLayerId(),
    kind: 'cta',
    x: 0.68,
    y: 0.88,
    w: 0.28,
    h: 0.08,
    rotation: 0,
    opacity: 1,
    align_h: 'center',
    align_v: 'middle',
    content: 'Shop now',
    weight: 'bold',
    size_pct: 4,
    color_key: 'primary',
    bg_color_key: 'background',
    padding_pct: 1.5,
    radius_pct: 50,
  })

  return {
    background: { type: 'product_photo', fit: 'cover' },
    layers,
  }
}
