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

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16'

const VALID_ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16']

interface ContentVariantRow {
  id: string
  campaign_id: string
  copy_text: string
  call_to_action: string | null
}

interface CampaignShirtRow {
  shirt_product_id: string
  shirt_products: {
    images: string[]
    name: string
  }
}

interface CreativeAssetInsert {
  content_variant_id: string
  asset_type: 'image'
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
    // 2. Fetch the campaign's shirts (via campaign_shirts join table)
    // -----------------------------------------------------------------------
    const { data: campaignShirts, error: shirtsError } = await client
      .from('campaign_shirts')
      .select('shirt_product_id, shirt_products(images, name)')
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

    // -----------------------------------------------------------------------
    // 3. Build the overlay text from the variant copy
    // -----------------------------------------------------------------------
    const overlayText = variant.call_to_action ?? variant.copy_text.slice(0, 80)

    // -----------------------------------------------------------------------
    // 4. For each shirt × aspect ratio, call Vercel generate-image
    // -----------------------------------------------------------------------
    const assetInserts: CreativeAssetInsert[] = []
    let slideOrder = 1

    for (const shirt of campaignShirts) {
      const images: string[] = shirt.shirt_products?.images ?? []
      const primaryImage = images[0]

      if (!primaryImage) {
        // Skip shirts with no images rather than failing the whole batch
        continue
      }

      for (const ratio of validRatios) {
        let generatedUrl = primaryImage // fallback if Vercel call fails

        try {
          const generateRes = await fetch(generateImageEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_image_url: primaryImage,
              overlay_text: overlayText,
              aspect_ratio: ratio,
            }),
          })

          if (generateRes.ok) {
            const generateData = await generateRes.json() as { generated_image_url: string }
            generatedUrl = generateData.generated_image_url ?? primaryImage
          }
          // If the call fails we still insert a record with the source image so the
          // asset exists and can be regenerated later.
        } catch {
          // Network error — continue with fallback URL
        }

        assetInserts.push({
          content_variant_id: variant.id,
          asset_type: 'image',
          source_product_image_url: primaryImage,
          generated_image_url: generatedUrl,
          overlay_text: overlayText,
          aspect_ratio: ratio,
          slide_order: slideOrder++,
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
