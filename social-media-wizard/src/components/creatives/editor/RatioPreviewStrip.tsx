import type { DesignSpec, BrandPalette, DesignAspectRatio } from '@/lib/design-spec'
import { ALL_RATIOS, RATIO_DIMENSIONS, resolveLayers, resolveColor } from '@/lib/design-spec'

interface Props {
  spec: DesignSpec
  palette: BrandPalette
  vars: Record<string, string | number | null | undefined>
  backgroundImageUrl: string | null
  previewWidth?: number
}

export function RatioPreviewStrip({ spec, palette, vars, backgroundImageUrl, previewWidth = 120 }: Props) {
  return (
    <div className="space-y-3" data-slot="ratio-preview-strip">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        All ratios
      </p>
      <div className="flex flex-wrap gap-3">
        {ALL_RATIOS.map((ratio) => (
          <RatioPreview
            key={ratio}
            ratio={ratio}
            spec={spec}
            palette={palette}
            vars={vars}
            backgroundImageUrl={backgroundImageUrl}
            previewWidth={previewWidth}
          />
        ))}
      </div>
    </div>
  )
}

function RatioPreview({
  ratio,
  spec,
  palette,
  vars,
  backgroundImageUrl,
  previewWidth,
}: {
  ratio: DesignAspectRatio
  spec: DesignSpec
  palette: BrandPalette
  vars: Record<string, string | number | null | undefined>
  backgroundImageUrl: string | null
  previewWidth: number
}) {
  const { width, height } = RATIO_DIMENSIONS[ratio]
  const scale = previewWidth / width
  const h = height * scale

  const resolved = resolveLayers(spec, { ratio, palette, vars })
  const bg =
    spec.background.type === 'solid'
      ? resolveColor(spec.background.color_key, palette)
      : '#e5e7eb'

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative overflow-hidden rounded border border-border shadow-sm"
        style={{ width: previewWidth, height: h, background: bg }}
      >
        {spec.background.type === 'product_photo' && backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        )}
        {resolved.map((l) => {
          const common: React.CSSProperties = {
            position: 'absolute',
            top: l.y * scale,
            left: l.x * scale,
            width: l.w * scale,
            height: l.h * scale,
            transform: l.rotation ? `rotate(${l.rotation}deg)` : undefined,
            opacity: l.opacity,
          }

          if (l.kind === 'logo') {
            return (
              <div key={l.id} style={common}>
                {l.src_url ? (
                  <img src={l.src_url} alt="" className="h-full w-full object-contain" draggable={false} />
                ) : null}
              </div>
            )
          }

          const justify = l.align_h === 'left' ? 'flex-start' : l.align_h === 'right' ? 'flex-end' : 'center'
          const items = l.align_v === 'top' ? 'flex-start' : l.align_v === 'bottom' ? 'flex-end' : 'center'
          const textAlign: React.CSSProperties['textAlign'] =
            l.align_h === 'left' ? 'left' : l.align_h === 'right' ? 'right' : 'center'

          return (
            <div
              key={l.id}
              style={{
                ...common,
                display: 'flex',
                justifyContent: justify,
                alignItems: items,
                background: l.bg_color ?? 'transparent',
                color: l.color,
                fontWeight: l.weight === 'bold' ? 700 : 400,
                fontSize: l.font_size_px * scale,
                borderRadius: l.radius_px * scale,
                padding: l.padding_px * scale,
                textAlign,
                lineHeight: 1.25,
                overflow: 'hidden',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Helvetica, Arial, sans-serif',
              }}
            >
              {l.content}
            </div>
          )
        })}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{ratio}</span>
    </div>
  )
}
