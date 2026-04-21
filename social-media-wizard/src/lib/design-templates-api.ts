import { supabase } from './supabase'
import type { DesignTemplate, ShopBrand, ShirtProduct } from './types'
import type { BrandPalette, DesignSpec } from './design-spec'
import { DEFAULT_PALETTE } from './design-spec'

export async function fetchDesignTemplates(): Promise<DesignTemplate[]> {
  const { data, error } = await supabase
    .from('design_templates')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as DesignTemplate[]
}

export async function fetchDesignTemplate(id: string): Promise<DesignTemplate | null> {
  const { data, error } = await supabase
    .from('design_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as DesignTemplate) ?? null
}

export async function createDesignTemplate(payload: {
  name: string
  description?: string | null
  design_spec: DesignSpec
  palette_snapshot: BrandPalette | null
  thumbnail_url?: string | null
}): Promise<DesignTemplate> {
  const { data, error } = await supabase
    .from('design_templates')
    .insert({
      name: payload.name,
      description: payload.description ?? null,
      design_spec: payload.design_spec,
      palette_snapshot: payload.palette_snapshot,
      thumbnail_url: payload.thumbnail_url ?? null,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as DesignTemplate
}

export async function updateDesignTemplate(
  id: string,
  patch: Partial<{
    name: string
    description: string | null
    design_spec: DesignSpec
    palette_snapshot: BrandPalette | null
    thumbnail_url: string | null
    is_active: boolean
  }>,
): Promise<DesignTemplate> {
  const { data, error } = await supabase
    .from('design_templates')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as DesignTemplate
}

export async function deleteDesignTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('design_templates').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function fetchShopBrand(): Promise<ShopBrand | null> {
  const { data, error } = await supabase
    .from('shop_brand')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as ShopBrand) ?? null
}

export function paletteFromShopBrand(brand: ShopBrand | null): BrandPalette {
  if (!brand) return DEFAULT_PALETTE
  return {
    primary: brand.primary_color ?? DEFAULT_PALETTE.primary,
    secondary: brand.secondary_color ?? DEFAULT_PALETTE.secondary,
    foreground: brand.foreground_color ?? DEFAULT_PALETTE.foreground,
    background: brand.background_color ?? DEFAULT_PALETTE.background,
    square_logo_url: brand.square_logo_url,
    wide_logo_url: brand.logo_url,
  }
}

export async function fetchShirtsForPreview(): Promise<ShirtProduct[]> {
  const { data, error } = await supabase
    .from('shirt_products')
    .select('*')
    .eq('stock_status', 'in_stock')
    .order('name')
    .limit(12)

  if (error) throw new Error(error.message)
  return (data ?? []) as ShirtProduct[]
}

/**
 * Call the Vercel generate-image endpoint to render a design spec against a
 * product image. Returns a data: URL.
 */
export async function renderDesign(params: {
  product_image_url: string
  aspect_ratio: '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1'
  design_spec: DesignSpec
  palette: BrandPalette
  vars?: Record<string, string | number | null | undefined>
}): Promise<string> {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Render failed' }))
    throw new Error(err.error ?? 'Render failed')
  }
  const data = (await res.json()) as { generated_image_url: string }
  return data.generated_image_url
}
