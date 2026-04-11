// T038 — Generate Image (Vercel Node.js Serverless Function)
// POST /api/generate-image
// Body: { product_image_url: string, overlay_text: string, brand_color?: string, aspect_ratio: '1:1' | '4:5' | '16:9' | '9:16' }
//
// Stub implementation: downloads the product image and echoes the URL back.
// Actual sharp compositing to be implemented once sharp is available in the build.

import type { VercelRequest, VercelResponse } from '@vercel/node'

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16'

interface GenerateImageBody {
  product_image_url: string
  overlay_text: string
  brand_color?: string
  aspect_ratio: AspectRatio
}

const VALID_ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16']

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' })
    return
  }

  // Parse and validate body
  const body = req.body as Partial<GenerateImageBody>

  if (!body.product_image_url || typeof body.product_image_url !== 'string') {
    res.status(400).json({ error: 'product_image_url is required and must be a string.' })
    return
  }

  if (!body.overlay_text || typeof body.overlay_text !== 'string') {
    res.status(400).json({ error: 'overlay_text is required and must be a string.' })
    return
  }

  if (!body.aspect_ratio || !VALID_ASPECT_RATIOS.includes(body.aspect_ratio)) {
    res.status(400).json({
      error: `aspect_ratio is required and must be one of: ${VALID_ASPECT_RATIOS.join(', ')}.`,
    })
    return
  }

  const { product_image_url, overlay_text, brand_color, aspect_ratio } = body as GenerateImageBody

  try {
    // Download the product image to verify it is reachable
    const imageResponse = await fetch(product_image_url)

    if (!imageResponse.ok) {
      res.status(422).json({
        error: `Failed to download product image. HTTP ${imageResponse.status}: ${imageResponse.statusText}`,
      })
      return
    }

    const contentType = imageResponse.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      res.status(422).json({
        error: `URL does not point to an image. Content-Type: ${contentType}`,
      })
      return
    }

    // -------------------------------------------------------------------
    // Stub: return the original URL until sharp compositing is implemented.
    // When sharp is available, this section will:
    //   1. Buffer the downloaded image.
    //   2. Resize to the target dimensions for the given aspect_ratio.
    //   3. Composite overlay_text using a canvas/SVG layer tinted brand_color.
    //   4. Upload the resulting buffer to Supabase Storage.
    //   5. Return the public URL of the uploaded asset.
    // -------------------------------------------------------------------

    res.status(200).json({
      generated_image_url: product_image_url,
      overlay_text,
      brand_color: brand_color ?? null,
      aspect_ratio,
      status: 'stub',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
