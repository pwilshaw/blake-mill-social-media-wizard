import { useRef, useCallback } from 'react'
import type { DesignSpec, DesignLayer, BrandPalette } from '@/lib/design-spec'
import { resolveColor } from '@/lib/design-spec'
import { LayerItem } from './LayerItem'

interface Props {
  spec: DesignSpec
  palette: BrandPalette
  vars: Record<string, string | number | null | undefined>
  backgroundImageUrl: string | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdateLayer: (id: string, patch: Partial<DesignLayer>) => void
  // pixel size of the square canvas
  size?: number
  showSafeZoneForRatio?: '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1' | null
}

export function DesignCanvas({
  spec,
  palette,
  vars,
  backgroundImageUrl,
  selectedId,
  onSelect,
  onUpdateLayer,
  size = 640,
  showSafeZoneForRatio,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) onSelect(null)
  }, [onSelect])

  const bgStyle: React.CSSProperties =
    spec.background.type === 'solid'
      ? { background: resolveColor(spec.background.color_key, palette) }
      : { background: '#e5e7eb' }

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="relative overflow-hidden rounded-md shadow-lg select-none"
      style={{ width: size, height: size, ...bgStyle }}
      data-slot="design-canvas"
    >
      {spec.background.type === 'product_photo' && backgroundImageUrl && (
        <img
          src={backgroundImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          draggable={false}
        />
      )}

      {showSafeZoneForRatio && (
        <SafeZoneGuide ratio={showSafeZoneForRatio} size={size} />
      )}

      {spec.layers.map((layer) => (
        <LayerItem
          key={layer.id}
          layer={layer}
          palette={palette}
          vars={vars}
          canvasSize={size}
          canvasRef={canvasRef}
          selected={layer.id === selectedId}
          onSelect={() => onSelect(layer.id)}
          onUpdate={(patch) => onUpdateLayer(layer.id, patch)}
        />
      ))}
    </div>
  )
}

// Visual hint showing the safe-zone inset for the currently-previewed ratio.
// The content box is ALWAYS the full canvas in 1:1 editing mode — but we can
// show which slice of the canvas is used by 9:16 / 16:9 etc.
function SafeZoneGuide({
  ratio,
  size,
}: {
  ratio: '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1'
  size: number
}) {
  // Show the "safe" rectangle for the given ratio overlaid on the 1:1 canvas.
  // The rectangle is computed as: centred square of the ratio's safe-zone-adjusted
  // frame, mapped back onto the 1:1 canvas. Since we edit at 1:1, this is always
  // the safe-inset square of a 1:1 canvas (all rectangles centre-align).
  const inset = ratio === '9:16' ? 0.04 : ratio === '4:5' ? 0.04 : 0.04
  const padding = size * inset
  return (
    <div
      className="pointer-events-none absolute border border-dashed border-primary/40"
      style={{
        top: padding,
        left: padding,
        width: size - padding * 2,
        height: size - padding * 2,
      }}
    />
  )
}
