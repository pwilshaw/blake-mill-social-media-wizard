// Single source of truth for brand voice + guidelines + reference designs.
// Every voice-emitting Claude consumer should call getBrandKnowledge() and
// inject formatBrandSection() at the top of its system prompt.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface BrandKnowledge {
  tone_of_voice: string | null
  brand_guidelines: string | null
  dos_donts: string | null
  reference_image_urls: string[]
}

const REFERENCE_LIMIT = 3

export async function getBrandKnowledge(client: SupabaseClient): Promise<BrandKnowledge> {
  const [brandResp, refsResp] = await Promise.all([
    client
      .from('shop_brand')
      .select('tone_of_voice, brand_guidelines, dos_donts')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('brand_reference_designs')
      .select('url, ordinal, created_at')
      .order('ordinal', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(REFERENCE_LIMIT),
  ])
  const brand = (brandResp.data ?? null) as
    | { tone_of_voice: string | null; brand_guidelines: string | null; dos_donts: string | null }
    | null
  const refs = (refsResp.data ?? []) as Array<{ url: string }>
  return {
    tone_of_voice: brand?.tone_of_voice ?? null,
    brand_guidelines: brand?.brand_guidelines ?? null,
    dos_donts: brand?.dos_donts ?? null,
    reference_image_urls: refs.map((r) => r.url),
  }
}

/**
 * Format brand knowledge as a system-prompt block. Always returns something
 * — when fields are empty we still emit the section with "Not set" notes so
 * the consumer doesn't have to branch on presence.
 */
export function formatBrandSection(k: BrandKnowledge): string {
  const tone = k.tone_of_voice?.trim() || 'Not set — fall back to brand-appropriate friendly direct.'
  const guidelines = k.brand_guidelines?.trim() || 'Not set — use general tasteful menswear conventions.'
  const dosDonts = k.dos_donts?.trim() || '(none specified)'
  return `## Brand voice and guidelines

Tone of voice:
${tone}

Brand guidelines:
${guidelines}

Do's and Don'ts:
${dosDonts}

These rules take priority over any other voice guidance below.`
}

export const BRAND_REFERENCE_LIMIT = REFERENCE_LIMIT
