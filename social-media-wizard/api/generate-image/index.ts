// POST /api/generate-image
//
// Two modes:
//
// 1. Simple overlay (legacy):
//    { product_image_url, overlay_text, brand_color?, aspect_ratio }
//
// 2. Design-spec mode (Creative Designer):
//    { product_image_url, design_spec, palette, vars?, aspect_ratio, logo_urls? }
//
// Returns: { generated_image_url: "data:image/png;base64,..." , ... }

import type { VercelRequest, VercelResponse } from '@vercel/node'
import sharp from 'sharp'

// ---------------------------------------------------------------------------
// Shared types (mirror src/lib/design-spec.ts — duplicated because Vercel
// serverless can't resolve the @/ alias from the Vite app)
// ---------------------------------------------------------------------------

type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '1.91:1'

type AlignH = 'left' | 'center' | 'right'
type AlignV = 'top' | 'middle' | 'bottom'

type ColorKey =
  | 'primary'
  | 'secondary'
  | 'foreground'
  | 'background'
  | 'neutral-white'
  | 'neutral-black'
  | 'neutral-dim'

type LayerKind = 'title' | 'subtitle' | 'cta' | 'logo' | 'chip'

interface DesignLayer {
  id: string
  kind: LayerKind
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
  size_pct?: number
  color_key?: ColorKey
  bg_color_key?: ColorKey
  padding_pct?: number
  radius_pct?: number
  src_key?: 'brand_square' | 'brand_wide'
  hidden?: boolean
}

interface DesignSpec {
  background: {
    type: 'product_photo' | 'solid'
    color_key?: ColorKey
    fit?: 'cover' | 'contain'
  }
  layers: DesignLayer[]
}

interface BrandPalette {
  primary: string
  secondary: string
  foreground: string
  background: string
  square_logo_url?: string | null
  wide_logo_url?: string | null
}

interface GenerateImageBody {
  product_image_url: string
  aspect_ratio: AspectRatio
  // Simple mode
  overlay_text?: string
  brand_color?: string
  // Design-spec mode
  design_spec?: DesignSpec
  palette?: BrandPalette
  vars?: Record<string, string | number | null | undefined>
}

const VALID_ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '16:9', '9:16', '1.91:1']

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1.91:1': { width: 1200, height: 628 },
}

interface SafeZone { top: number; right: number; bottom: number; left: number }

const SAFE_ZONES: Record<AspectRatio, SafeZone> = {
  '1:1': { top: 0.04, right: 0.04, bottom: 0.04, left: 0.04 },
  '4:5': { top: 0.06, right: 0.04, bottom: 0.06, left: 0.04 },
  '9:16': { top: 0.12, right: 0.04, bottom: 0.18, left: 0.04 },
  '16:9': { top: 0.06, right: 0.06, bottom: 0.06, left: 0.06 },
  '1.91:1': { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
}

const DEFAULT_PALETTE: BrandPalette = {
  primary: '#1a1a2e',
  secondary: '#e2e8f0',
  foreground: '#0f172a',
  background: '#ffffff',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function resolveColor(key: ColorKey | undefined, palette: BrandPalette): string {
  switch (key) {
    case 'primary': return palette.primary
    case 'secondary': return palette.secondary
    case 'foreground': return palette.foreground
    case 'background': return palette.background
    case 'neutral-white': return '#ffffff'
    case 'neutral-black': return '#000000'
    case 'neutral-dim': return 'rgba(0,0,0,0.55)'
    default: return palette.foreground
  }
}

function substitute(
  raw: string | undefined,
  vars: Record<string, string | number | null | undefined>,
): string {
  if (!raw) return ''
  return raw.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key]
    return v === null || v === undefined ? '' : String(v)
  })
}

function computeContentBox(ratio: AspectRatio): { x: number; y: number; w: number; h: number } {
  const { width, height } = DIMENSIONS[ratio]
  const safe = SAFE_ZONES[ratio]
  const safeW = width * (1 - safe.left - safe.right)
  const safeH = height * (1 - safe.top - safe.bottom)
  const size = Math.min(safeW, safeH)
  const x = safe.left * width + (safeW - size) / 2
  const y = safe.top * height + (safeH - size) / 2
  return { x, y, w: size, h: size }
}

function wrapLines(
  text: string,
  fontSize: number,
  maxWidth: number,
  weight: 'regular' | 'bold',
): string[] {
  if (!text) return []
  const avgCharPx = fontSize * (weight === 'bold' ? 0.58 : 0.52)
  const maxChars = Math.max(4, Math.floor(maxWidth / avgCharPx))
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

// ---------------------------------------------------------------------------
// Layer → SVG fragment (text / chip / cta)
// Returns null for logo layers (they are composited separately as raster).
// ---------------------------------------------------------------------------

function renderTextLayer(
  layer: DesignLayer,
  box: { x: number; y: number; w: number; h: number },
  palette: BrandPalette,
  vars: Record<string, string | number | null | undefined>,
): string {
  // Layer top-left in frame pixels.
  const w = layer.w * box.w
  const h = layer.h * box.h
  const x = box.x + layer.x * box.w
  const y = box.y + layer.y * box.h

  const fontSize = Math.round(((layer.size_pct ?? 6) / 100) * box.h)
  const padding = Math.round(((layer.padding_pct ?? 0) / 100) * box.h)
  const radius = Math.round(((layer.radius_pct ?? 0) / 100) * h)
  const color = resolveColor(layer.color_key, palette)
  const bgColor = layer.bg_color_key ? resolveColor(layer.bg_color_key, palette) : null
  const weight = layer.weight ?? 'bold'
  const content = substitute(layer.content, vars)

  const innerMaxW = Math.max(4, w - padding * 2)
  const lines = wrapLines(content, fontSize, innerMaxW, weight)
  const lineHeight = Math.round(fontSize * 1.25)
  const textBlockH = lines.length * lineHeight

  const textAnchor = layer.align_h === 'left' ? 'start' : layer.align_h === 'right' ? 'end' : 'middle'
  const textX = layer.align_h === 'left' ? x + padding : layer.align_h === 'right' ? x + w - padding : x + w / 2

  // Vertical alignment of the text block inside the box.
  const topY =
    layer.align_v === 'top'
      ? y + padding
      : layer.align_v === 'bottom'
        ? y + h - padding - textBlockH
        : y + (h - textBlockH) / 2
  const firstBaseline = topY + fontSize * 0.82

  const transform = layer.rotation
    ? ` transform="rotate(${layer.rotation.toFixed(2)} ${(x + w / 2).toFixed(2)} ${(y + h / 2).toFixed(2)})"`
    : ''
  const opacity = layer.opacity < 1 ? ` opacity="${layer.opacity}"` : ''

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${textX.toFixed(2)}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('')

  const bgRect = bgColor
    ? `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${radius}" ry="${radius}" fill="${bgColor}"/>`
    : ''

  const textEl = lines.length === 0
    ? ''
    : `<text x="${textX.toFixed(2)}" y="${firstBaseline.toFixed(2)}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="${weight === 'bold' ? 700 : 400}" fill="${color}" text-anchor="${textAnchor}">${tspans}</text>`

  return `<g${transform}${opacity}>${bgRect}${textEl}</g>`
}

async function renderLogoLayer(
  layer: DesignLayer,
  box: { x: number; y: number; w: number; h: number },
  palette: BrandPalette,
): Promise<{ buffer: Buffer; top: number; left: number } | null> {
  const src =
    layer.src_key === 'brand_wide'
      ? palette.wide_logo_url ?? palette.square_logo_url
      : palette.square_logo_url ?? palette.wide_logo_url
  if (!src) return null

  const w = Math.max(1, Math.round(layer.w * box.w))
  const h = Math.max(1, Math.round(layer.h * box.h))
  const leftBase = Math.round(box.x + layer.x * box.w)
  const topBase = Math.round(box.y + layer.y * box.h)

  try {
    const res = await fetch(src)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    let pipeline = sharp(buf).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    if (layer.rotation) {
      pipeline = pipeline.rotate(layer.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    }
    if (layer.opacity < 1) {
      pipeline = pipeline.composite([{
        input: Buffer.from([255, 255, 255, Math.round(layer.opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      }])
    }
    const rendered = await pipeline.png().toBuffer({ resolveWithObject: true })
    // When rotated, sharp enlarges the canvas. Re-centre on the original box centre.
    const centreX = leftBase + w / 2
    const centreY = topBase + h / 2
    const top = Math.round(centreY - rendered.info.height / 2)
    const left = Math.round(centreX - rendered.info.width / 2)
    return { buffer: rendered.data, top, left }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Legacy simple overlay (kept for back-compat)
// ---------------------------------------------------------------------------

function createSimpleOverlaySvg(text: string, width: number, height: number, color: string): Buffer {
  const fontSize = Math.round(width * 0.045)
  const padding = Math.round(width * 0.06)
  const maxWidth = width - padding * 2
  const lines = wrapLines(text, fontSize, maxWidth, 'bold')
  const lineHeight = fontSize * 1.4
  const blockHeight = lines.length * lineHeight + padding * 2
  const yStart = height - blockHeight - padding
  const tspans = lines
    .map(
      (line, i) => `<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="${yStart}" width="${width}" height="${blockHeight + padding}" fill="rgba(0,0,0,0.55)" rx="0"/>
    <text x="${width / 2}" y="${yStart + padding + fontSize}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="middle">${tspans}</text>
  </svg>`
  return Buffer.from(svg)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' })
    return
  }

  const body = req.body as Partial<GenerateImageBody>

  if (!body.product_image_url || typeof body.product_image_url !== 'string') {
    res.status(400).json({ error: 'product_image_url is required and must be a string.' })
    return
  }

  if (!body.aspect_ratio || !VALID_ASPECT_RATIOS.includes(body.aspect_ratio)) {
    res.status(400).json({
      error: `aspect_ratio is required and must be one of: ${VALID_ASPECT_RATIOS.join(', ')}.`,
    })
    return
  }

  const { product_image_url, aspect_ratio, design_spec, palette: inputPalette, vars, overlay_text, brand_color } = body as GenerateImageBody

  const { width, height } = DIMENSIONS[aspect_ratio]
  const palette: BrandPalette = { ...DEFAULT_PALETTE, ...(inputPalette ?? {}) }

  try {
    // -------------------------------------------------------------------
    // 1. Build base image
    // -------------------------------------------------------------------
    const wantsPhotoBackground = design_spec
      ? design_spec.background.type === 'product_photo'
      : true

    let baseBuffer: Buffer

    if (wantsPhotoBackground) {
      const imageResponse = await fetch(product_image_url)
      if (!imageResponse.ok) {
        res.status(422).json({
          error: `Failed to download product image. HTTP ${imageResponse.status}: ${imageResponse.statusText}`,
        })
        return
      }
      const contentType = imageResponse.headers.get('content-type') ?? ''
      if (!contentType.startsWith('image/')) {
        res.status(422).json({ error: `URL does not point to an image. Content-Type: ${contentType}` })
        return
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      baseBuffer = await sharp(imageBuffer).resize(width, height, { fit: 'cover', position: 'centre' }).toBuffer()
    } else {
      const bg = resolveColor(design_spec?.background.color_key, palette)
      baseBuffer = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: bg,
        },
      })
        .png()
        .toBuffer()
    }

    // -------------------------------------------------------------------
    // 2. Simple mode — legacy overlay text
    // -------------------------------------------------------------------
    if (!design_spec) {
      if (!overlay_text || typeof overlay_text !== 'string') {
        res.status(400).json({ error: 'overlay_text is required when design_spec is not provided.' })
        return
      }
      const color = brand_color ?? '#ffffff'
      const overlaySvg = createSimpleOverlaySvg(overlay_text, width, height, color)
      const composited = await sharp(baseBuffer)
        .composite([{ input: overlaySvg, top: 0, left: 0 }])
        .png({ quality: 90 })
        .toBuffer()

      res.status(200).json({
        generated_image_url: `data:image/png;base64,${composited.toString('base64')}`,
        overlay_text,
        brand_color: color,
        aspect_ratio,
        width,
        height,
        size_bytes: composited.length,
        status: 'generated',
      })
      return
    }

    // -------------------------------------------------------------------
    // 3. Design-spec mode — composite text SVG + logo rasters in z-order
    // -------------------------------------------------------------------
    const box = computeContentBox(aspect_ratio)
    const v = vars ?? {}
    const layers = design_spec.layers.filter((l) => !l.hidden)

    const textSvgFragments: string[] = []
    const logoOverlays: Array<{ input: Buffer; top: number; left: number }> = []

    for (const layer of layers) {
      if (layer.kind === 'logo') {
        const rendered = await renderLogoLayer(layer, box, palette)
        if (rendered) logoOverlays.push({ input: rendered.buffer, top: rendered.top, left: rendered.left })
      } else {
        textSvgFragments.push(renderTextLayer(layer, box, palette, v))
      }
    }

    const overlaySvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${textSvgFragments.join('')}</svg>`,
    )

    // Composite logos first (they appear behind text) then the text SVG.
    // If a designer wants logos above text, we'd need explicit z-ordering —
    // for v1 we preserve the declared order by interleaving logo composites
    // before/after the text group isn't supported. Keep it simple: logos
    // first, then text overlay on top.
    let composition = sharp(baseBuffer)
    if (logoOverlays.length > 0) {
      composition = composition.composite(logoOverlays)
      const mid = await composition.png().toBuffer()
      composition = sharp(mid)
    }
    const composited = await composition
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .png({ quality: 90 })
      .toBuffer()

    res.status(200).json({
      generated_image_url: `data:image/png;base64,${composited.toString('base64')}`,
      aspect_ratio,
      width,
      height,
      size_bytes: composited.length,
      layer_count: layers.length,
      status: 'generated',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: `Internal server error: ${message}` })
  }
}
