// Frontend wrappers for /brand page.
// Reads/writes shop_brand text fields and brand_reference_designs rows.
// Reuses the existing brand-assets Storage bucket (created in migration 012).

import { supabase } from '@/lib/supabase'
import type { BrandReferenceDesign, ShopBrand } from '@/lib/types'

const BUCKET = 'brand-assets'
const REFS_PREFIX = 'references'

export async function getBrand(): Promise<ShopBrand | null> {
  const { data, error } = await supabase
    .from('shop_brand')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as ShopBrand) ?? null
}

export async function updateBrandText(patch: Partial<Pick<ShopBrand, 'tone_of_voice' | 'brand_guidelines' | 'dos_donts'>>): Promise<void> {
  const existing = await getBrand()
  const shop_domain = existing?.shop_domain ?? 'local'
  const { error } = await supabase
    .from('shop_brand')
    .upsert(
      {
        shop_domain,
        ...existing,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_domain' },
    )
  if (error) throw new Error(error.message)
}

export async function listReferenceDesigns(): Promise<BrandReferenceDesign[]> {
  const { data, error } = await supabase
    .from('brand_reference_designs')
    .select('*')
    .order('ordinal', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as BrandReferenceDesign[]
}

export async function uploadReferenceDesign(file: File, caption?: string): Promise<BrandReferenceDesign> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${REFS_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type })
  if (upload.error) throw new Error(upload.error.message)
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

  // Compute the next ordinal so newcomers land at the end.
  const { data: existing } = await supabase
    .from('brand_reference_designs')
    .select('ordinal')
    .order('ordinal', { ascending: false })
    .limit(1)
  const nextOrdinal = existing && existing[0] ? Number(existing[0].ordinal) + 1 : 0

  const { data, error } = await supabase
    .from('brand_reference_designs')
    .insert({ url: urlData.publicUrl, caption: caption ?? null, ordinal: nextOrdinal })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BrandReferenceDesign
}

export async function updateReferenceCaption(id: string, caption: string | null): Promise<void> {
  const { error } = await supabase
    .from('brand_reference_designs')
    .update({ caption })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteReferenceDesign(design: BrandReferenceDesign): Promise<void> {
  // Best-effort: pull the storage path back out of the public URL so we can
  // remove the underlying object before deleting the row.
  try {
    const url = new URL(design.url)
    const idx = url.pathname.indexOf(`/${BUCKET}/`)
    if (idx !== -1) {
      const objectPath = url.pathname.slice(idx + BUCKET.length + 2)
      await supabase.storage.from(BUCKET).remove([objectPath])
    }
  } catch {
    /* ignore — orphaned object is preferable to leaving the row */
  }
  const { error } = await supabase
    .from('brand_reference_designs')
    .delete()
    .eq('id', design.id)
  if (error) throw new Error(error.message)
}

export async function reorderReferenceDesign(
  rows: BrandReferenceDesign[],
  id: string,
  direction: 'up' | 'down',
): Promise<void> {
  const sorted = [...rows].sort((a, b) => a.ordinal - b.ordinal || a.created_at.localeCompare(b.created_at))
  const idx = sorted.findIndex((r) => r.id === id)
  if (idx === -1) return
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= sorted.length) return
  const a = sorted[idx]
  const b = sorted[target]
  // Swap ordinals
  await Promise.all([
    supabase.from('brand_reference_designs').update({ ordinal: b.ordinal }).eq('id', a.id),
    supabase.from('brand_reference_designs').update({ ordinal: a.ordinal }).eq('id', b.id),
  ])
}
