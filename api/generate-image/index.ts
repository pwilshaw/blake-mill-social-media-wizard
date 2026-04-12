// T038 — Generate Image (Vercel Node.js Serverless Function)
// POST /api/generate-image
// Body: { product_image_url, overlay_text, brand_color?, aspect_ratio }
//
// Uses sharp to composite product image with text overlay,
// then returns the resulting image as a base64 data URL.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16'

interface GenerateImageBody {
  product_image_url: string
  overlay_text: string
  brand_color?: string
  aspect_ratio: AspectRatio
}

const VALID_ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16']

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createTextOverlaySvg(
  text: string,
  width: number,
  height: number,
  color: string
): Buffer {
  const fontSize = Math.round(width * 0.045)
  const padding = Math.round(width * 0.06)
  const maxWidth = width - padding * 2

  // Word-wrap text
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    // Approximate: ~0.55 chars per fontSize width
    if (test.length * fontSize * 0.55 > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)

  const lineHeight = fontSize * 1.4
  const blockHeight = lines.length * lineHeight + padding * 2
  const yStart = height - blockHeight - padding

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
    )
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="${yStart}" width="${width}" height="${blockHeight + padding}" fill="rgba(0,0,0,0.55)" rx="0"/>
    <text
      x="${width / 2}"
      y="${yStart + padding + fontSize}"
      font-family="Arial, Helvetica, sans-serif"
      font-size="${fontSize}"
      font-weight="bold"
      fill="${color}"
      text-anchor="middle"
    >${tspans}</text>
  </svg>`

  return Buffer.from(svg)
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' })
    return
  }

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

  const { product_image_url, overlay_text, brand_color, aspect_ratio } =
    body as GenerateImageBody

  const color = brand_color ?? '#ffffff'
  const { width, height } = DIMENSIONS[aspect_ratio]

  try {
    // Download the product image
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

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Resize product image to fill the target dimensions
    const resized = await sharp(imageBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .toBuffer()

    // Create SVG text overlay
    const overlaySvg = createTextOverlaySvg(overlay_text, width, height, color)

    // Composite text overlay onto the product image
    const composited = await sharp(resized)
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .png({ quality: 90 })
      .toBuffer()

    // Return as base64 data URL
    const base64 = composited.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    res.status(200).json({
      generated_image_url: dataUrl,
      overlay_text,
      brand_color: color,
      aspect_ratio,
      width,
      height,
      size_bytes: composited.length,
      status: 'generated',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
