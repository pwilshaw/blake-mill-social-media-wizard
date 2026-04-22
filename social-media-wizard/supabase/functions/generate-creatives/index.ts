// T041 — Generate Creatives Edge Function (Deno)
// POST /functions/v1/generate-creatives
// Body: { content_variant_id: string, aspect_ratios: string[] }
//
// Fetches the content variant and its campaign's shirts.
// For each shirt image × aspect ratio combination, calls the Vercel
// generate-image endpoint and creates a CreativeAsset record in Supabase.
// Returns the array of created assets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Types (mirrors data-model.md)
// ---------------------------------------------------------------------------

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '1.91:1'

const VALID_ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16', '1.91:1']

interface ContentVariantRow {
  id: string
  campaign_id: string
  copy_text: string
  call_to_action: string | null
}

interface CampaignRow {
  id: string
  design_template_id: string | null
  post_type: 'single' | 'carousel'
}

interface DesignTemplateRow {
  id: string
  design_spec: Record<string, unknown>
  palette_snapshot: Record<string, unknown> | null
}

interface ShopBrandRow {
  primary_color: string | null
  secondary_color: string | null
  foreground_color: string | null
  background_color: string | null
  logo_url: string | null
  square_logo_url: string | null
}

interface CampaignShirtRow {
  shirt_product_id: string
  shirt_products: {
    images: string[]
    name: string
    price: number | null
  }
}

interface CreativeAssetInsert {
  content_variant_id: string
  asset_type: 'image' | 'carousel_slide'
  source_product_image_url: string
  generated_image_url: string
  overlay_text: string | null
  aspect_ratio: AspectRatio
  slide_order: number
  approval_status: 'pending'
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const generateImageEndpoint = Deno.env.get('VERCEL_GENERATE_IMAGE_URL') ??
    'https://blake-mill.vercel.app/api/generate-image'

  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: { content_variant_id?: unknown; aspect_ratios?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const { content_variant_id, aspect_ratios } = body

  // Validate inputs
  if (!content_variant_id || typeof content_variant_id !== 'string') {
    return jsonResponse({ error: 'content_variant_id is required and must be a string.' }, 400)
  }

  if (!Array.isArray(aspect_ratios) || aspect_ratios.length === 0) {
    return jsonResponse({ error: 'aspect_ratios must be a non-empty array.' }, 400)
  }

  const invalidRatios = aspect_ratios.filter((r) => !VALID_ASPECT_RATIOS.includes(r as AspectRatio))
  if (invalidRatios.length > 0) {
    return jsonResponse(
      {
        error: `Invalid aspect_ratios: ${invalidRatios.join(', ')}. Valid values: ${VALID_ASPECT_RATIOS.join(', ')}.`,
      },
      400,
    )
  }

  const validRatios = aspect_ratios as AspectRatio[]

  try {
    // -----------------------------------------------------------------------
    // 1. Fetch the content variant
    // -----------------------------------------------------------------------
    const { data: variant, error: variantError } = await client
      .from('content_variants')
      .select('id, campaign_id, copy_text, call_to_action')
      .eq('id', content_variant_id)
      .single<ContentVariantRow>()

    if (variantError || !variant) {
      const status = variantError?.code === 'PGRST116' ? 404 : 500
      return jsonResponse(
        { error: variantError?.message ?? 'Content variant not found.' },
        status,
      )
    }

    // -----------------------------------------------------------------------
    // 2. Fetch the campaign (for design_template_id) + shirts + brand
    // -----------------------------------------------------------------------
    const { data: campaign, error: campaignError } = await client
      .from('campaigns')
      .select('id, design_template_id, post_type')
      .eq('id', variant.campaign_id)
      .single<CampaignRow>()

    if (campaignError) {
      return jsonResponse({ error: campaignError.message }, 500)
    }

    const { data: campaignShirts, error: shirtsError } = await client
      .from('campaign_shirts')
      .select('shirt_product_id, shirt_products(images, name, price)')
      .eq('campaign_id', variant.campaign_id)
      .returns<CampaignShirtRow[]>()

    if (shirtsError) {
      return jsonResponse({ error: shirtsError.message }, 500)
    }

    if (!campaignShirts || campaignShirts.length === 0) {
      return jsonResponse(
        { error: 'No shirts found for this campaign.' },
        422,
      )
    }

    // Load the design template if the campaign uses one
    let designSpec: Record<string, unknown> | null = null
    let palette: Record<string, unknown> | null = null

    if (campaign?.design_template_id) {
      const { data: tpl } = await client
        .from('design_templates')
        .select('id, design_spec, palette_snapshot')
        .eq('id', campaign.design_template_id)
        .single<DesignTemplateRow>()

      if (tpl) {
        designSpec = tpl.design_spec
        palette = tpl.palette_snapshot

        // Refresh palette from current shop_brand if the template didn't snapshot one
        if (!palette) {
          const { data: brand } = await client
            .from('shop_brand')
            .select('primary_color, secondary_color, foreground_color, background_color, logo_url, square_logo_url')
            .limit(1)
            .maybeSingle<ShopBrandRow>()
          if (brand) {
            palette = {
              primary: brand.primary_color ?? '#1a1a2e',
              secondary: brand.secondary_color ?? '#e2e8f0',
              foreground: brand.foreground_color ?? '#0f172a',
              background: brand.background_color ?? '#ffffff',
              square_logo_url: brand.square_logo_url,
              wide_logo_url: brand.logo_url,
            }
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 3. Build the overlay text from the variant copy (legacy / fallback)
    // -----------------------------------------------------------------------
    const overlayText = variant.call_to_action ?? variant.copy_text.slice(0, 80)

    // -----------------------------------------------------------------------
    // 4. For each shirt × aspect ratio, call Vercel generate-image
    // -----------------------------------------------------------------------
    // In single-post mode we emit one 'image' per (shirt × ratio) with a
    // globally-incrementing slide_order.
    // In carousel mode we emit 'carousel_slide' assets, resetting slide_order
    // per ratio so each ratio has its own 1..N sequence.
    const isCarousel = campaign?.post_type === 'carousel'
    const assetInserts: CreativeAssetInsert[] = []
    let singleSlideOrder = 1

    for (const ratio of validRatios) {
      let carouselSlideOrder = 1
      for (const shirt of campaignShirts) {
        const images: string[] = shirt.shirt_products?.images ?? []
        const primaryImage = images[0]
        if (!primaryImage) continue

        const productName = shirt.shirt_products?.name ?? ''
        const productPrice = shirt.shirt_products?.price
        const priceStr = typeof productPrice === 'number' ? `£${productPrice.toFixed(0)}` : ''

        let generatedUrl = primaryImage

        try {
          const body: Record<string, unknown> = {
            product_image_url: primaryImage,
            aspect_ratio: ratio,
          }
          if (designSpec) {
            body.design_spec = designSpec
            body.palette = palette
            body.vars = {
              product_name: productName.toUpperCase(),
              price: priceStr,
              cta: variant.call_to_action ?? 'Shop now',
            }
          } else {
            body.overlay_text = overlayText
          }

          const generateRes = await fetch(generateImageEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

          if (generateRes.ok) {
            const generateData = await generateRes.json() as { generated_image_url: string }
            generatedUrl = generateData.generated_image_url ?? primaryImage
          }
        } catch {
          // Network error — continue with fallback URL
        }

        assetInserts.push({
          content_variant_id: variant.id,
          asset_type: isCarousel ? 'carousel_slide' : 'image',
          source_product_image_url: primaryImage,
          generated_image_url: generatedUrl,
          overlay_text: overlayText,
          aspect_ratio: ratio,
          slide_order: isCarousel ? carouselSlideOrder++ : singleSlideOrder++,
          approval_status: 'pending',
        })
      }
    }

    if (assetInserts.length === 0) {
      return jsonResponse({ error: 'No valid shirt images found to generate creatives from.' }, 422)
    }

    // -----------------------------------------------------------------------
    // 5. Upsert CreativeAsset records
    // -----------------------------------------------------------------------
    const { data: createdAssets, error: insertError } = await client
      .from('creative_assets')
      .insert(assetInserts)
      .select()

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500)
    }

    return jsonResponse({
      assets: createdAssets,
      count: createdAssets?.length ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: `Internal server error: ${message}` }, 500)
  }
})
