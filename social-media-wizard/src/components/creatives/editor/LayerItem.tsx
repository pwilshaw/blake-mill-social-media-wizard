import { useCallback, useRef } from 'react'
import type { RefObject } from 'react'
import type { DesignLayer, BrandPalette } from '@/lib/design-spec'
import { resolveColor } from '@/lib/design-spec'
import { RotateCw } from 'lucide-react'

interface Props {
  layer: DesignLayer
  palette: BrandPalette
  vars: Record<string, string | number | null | undefined>
  canvasSize: number
  canvasRef: RefObject<HTMLDivElement | null>
  selected: boolean
  onSelect: () => void
  onUpdate: (patch: Partial<DesignLayer>) => void
}

function substitute(raw: string | undefined, vars: Record<string, string | number | null | undefined>): string {
  if (!raw) return ''
  return raw.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key]
    return v === null || v === undefined ? '' : String(v)
  })
}

export function LayerItem({
  layer,
  palette,
  vars,
  canvasSize,
  canvasRef,
  selected,
  onSelect,
  onUpdate,
}: Props) {
  const dragState = useRef<{
    startClientX: number
    startClientY: number
    startX: number
    startY: number
  } | null>(null)

  const rotateState = useRef<{ startAngle: number; startRot: number; cx: number; cy: number } | null>(null)

  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      ;(e.target as Element).setPointerCapture(e.pointerId)
      dragState.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: layer.x,
        startY: layer.y,
      }
      onSelect()
    },
    [layer.x, layer.y, onSelect],
  )

  const handleDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return
      const dx = (e.clientX - dragState.current.startClientX) / canvasSize
      const dy = (e.clientY - dragState.current.startClientY) / canvasSize
      const nextX = Math.max(0, Math.min(1 - layer.w, dragState.current.startX + dx))
      const nextY = Math.max(0, Math.min(1 - layer.h, dragState.current.startY + dy))
      onUpdate({ x: nextX, y: nextY })
    },
    [canvasSize, layer.w, layer.h, onUpdate],
  )

  const handleDragPointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* capture may have already been released */
    }
    dragState.current = null
  }, [])

  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      const canvasEl = canvasRef.current
      if (!canvasEl) return
      const rect = canvasEl.getBoundingClientRect()
      const cx = rect.left + (layer.x + layer.w / 2) * canvasSize
      const cy = rect.top + (layer.y + layer.h / 2) * canvasSize
      const startAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
      rotateState.current = { startAngle, startRot: layer.rotation, cx, cy }
    },
    [canvasRef, canvasSize, layer.x, layer.y, layer.w, layer.h, layer.rotation],
  )

  const handleRotatePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!rotateState.current) return
      const { startAngle, startRot, cx, cy } = rotateState.current
      const currentAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
      let next = startRot + (currentAngle - startAngle)
      if (e.shiftKey) next = Math.round(next / 15) * 15
      onUpdate({ rotation: Math.round(next) })
    },
    [onUpdate],
  )

  const handleRotatePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
    rotateState.current = null
  }, [])

  // Logos render as <img>, others as styled divs.
  const logoSrc =
    layer.kind === 'logo'
      ? layer.src_key === 'brand_wide'
        ? palette.wide_logo_url ?? palette.square_logo_url
        : palette.square_logo_url ?? palette.wide_logo_url
      : null

  const text = substitute(layer.content, vars)
  const fontSizePx = ((layer.size_pct ?? 6) / 100) * canvasSize
  const paddingPx = ((layer.padding_pct ?? 0) / 100) * canvasSize
  const radiusPx = ((layer.radius_pct ?? 0) / 100) * layer.h * canvasSize
  const bgColor = layer.bg_color_key ? resolveColor(layer.bg_color_key, palette) : 'transparent'
  const color = resolveColor(layer.color_key, palette)

  const style: React.CSSProperties = {
    position: 'absolute',
    top: layer.y * canvasSize,
    left: layer.x * canvasSize,
    width: layer.w * canvasSize,
    height: layer.h * canvasSize,
    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
    opacity: layer.opacity,
    cursor: 'move',
    outline: selected ? '2px solid rgb(99 102 241)' : 'none',
    outlineOffset: 2,
    touchAction: 'none',
  }

  if (layer.hidden) return null

  if (layer.kind === 'logo') {
    return (
      <div
        style={style}
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={handleDragPointerUp}
        onPointerCancel={handleDragPointerUp}
        data-slot="layer"
      >
        {logoSrc ? (
          <img src={logoSrc} alt="" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded border border-dashed border-muted-foreground/40 bg-muted/60 px-1 text-center text-[9px] leading-tight uppercase tracking-wider text-muted-foreground">
            <span>No logo</span>
            <a
              href="/integrations"
              onClick={(e) => e.stopPropagation()}
              className="text-[9px] lowercase tracking-normal text-primary underline"
            >
              upload one
            </a>
          </div>
        )}
        {selected && <RotateHandle onPointerDown={handleRotatePointerDown} onPointerMove={handleRotatePointerMove} onPointerUp={handleRotatePointerUp} />}
      </div>
    )
  }

  const justify =
    layer.align_h === 'left' ? 'flex-start' : layer.align_h === 'right' ? 'flex-end' : 'center'
  const items =
    layer.align_v === 'top' ? 'flex-start' : layer.align_v === 'bottom' ? 'flex-end' : 'center'
  const textAlign: React.CSSProperties['textAlign'] =
    layer.align_h === 'left' ? 'left' : layer.align_h === 'right' ? 'right' : 'center'

  return (
    <div
      style={style}
      onPointerDown={handleDragPointerDown}
      onPointerMove={handleDragPointerMove}
      onPointerUp={handleDragPointerUp}
      onPointerCancel={handleDragPointerUp}
      data-slot="layer"
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: justify,
          alignItems: items,
          padding: paddingPx,
          borderRadius: radiusPx,
          background: bgColor,
          color,
          fontWeight: layer.weight === 'bold' ? 700 : 400,
          fontSize: fontSizePx,
          fontFamily: 'Helvetica, Arial, sans-serif',
          lineHeight: 1.25,
          textAlign,
          letterSpacing: layer.kind === 'cta' ? '0.03em' : 0,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text || <span className="opacity-40">Double-click to edit</span>}
      </div>
      {selected && <RotateHandle onPointerDown={handleRotatePointerDown} onPointerMove={handleRotatePointerMove} onPointerUp={handleRotatePointerUp} />}
    </div>
  )
}

function RotateHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}) {
  return (
    <div
      className="absolute left-1/2 -top-8 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow cursor-grab"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title="Drag to rotate (Shift for 15° snap)"
      style={{ touchAction: 'none' }}
    >
      <RotateCw className="h-3 w-3" />
    </div>
  )
}
