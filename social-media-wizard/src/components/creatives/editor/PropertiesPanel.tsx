import type { DesignLayer, BrandPalette, ColorKey, AlignH, AlignV } from '@/lib/design-spec'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  layer: DesignLayer | null
  palette: BrandPalette
  onUpdate: (patch: Partial<DesignLayer>) => void
}

const COLOR_KEYS: { key: ColorKey; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'foreground', label: 'Foreground' },
  { key: 'background', label: 'Background' },
  { key: 'neutral-white', label: 'White' },
  { key: 'neutral-black', label: 'Black' },
]

function resolve(key: ColorKey | undefined, palette: BrandPalette): string {
  switch (key) {
    case 'primary': return palette.primary
    case 'secondary': return palette.secondary
    case 'foreground': return palette.foreground
    case 'background': return palette.background
    case 'neutral-white': return '#ffffff'
    case 'neutral-black': return '#000000'
    default: return 'transparent'
  }
}

export function PropertiesPanel({ layer, palette, onUpdate }: Props) {
  if (!layer) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-xs text-muted-foreground">Select a layer to edit its properties.</p>
      </div>
    )
  }

  const isText = layer.kind !== 'logo'

  return (
    <div className="flex h-full flex-col overflow-y-auto" data-slot="properties-panel">
      <div className="border-b border-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Properties</p>
      </div>

      <div className="flex-1 space-y-5 p-3">
        {isText && (
          <Field label="Text">
            <textarea
              value={layer.content ?? ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={2}
              placeholder="Type…  Use {product_name} {price} {cta}"
              className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        )}

        <Field label="Horizontal align">
          <AlignGroup<AlignH>
            value={layer.align_h}
            onChange={(v) => onUpdate({ align_h: v })}
            options={[
              { value: 'left', icon: AlignLeft, label: 'Left' },
              { value: 'center', icon: AlignCenter, label: 'Centre' },
              { value: 'right', icon: AlignRight, label: 'Right' },
            ]}
          />
        </Field>

        <Field label="Vertical align">
          <AlignGroup<AlignV>
            value={layer.align_v}
            onChange={(v) => onUpdate({ align_v: v })}
            options={[
              { value: 'top', icon: AlignStartVertical, label: 'Top' },
              { value: 'middle', icon: AlignCenterVertical, label: 'Middle' },
              { value: 'bottom', icon: AlignEndVertical, label: 'Bottom' },
            ]}
          />
        </Field>

        {isText && (
          <>
            <Field label="Weight">
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant={layer.weight === 'regular' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ weight: 'regular' })}
                >
                  Regular
                </Button>
                <Button
                  variant={layer.weight === 'bold' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ weight: 'bold' })}
                >
                  Bold
                </Button>
              </div>
            </Field>

            <Field label={`Size · ${(layer.size_pct ?? 6).toFixed(1)}%`}>
              <input
                type="range"
                min={2}
                max={16}
                step={0.5}
                value={layer.size_pct ?? 6}
                onChange={(e) => onUpdate({ size_pct: Number(e.target.value) })}
                className="w-full"
              />
            </Field>

            <Field label="Text colour">
              <SwatchGrid
                value={layer.color_key}
                onChange={(key) => onUpdate({ color_key: key })}
                palette={palette}
              />
            </Field>

            <Field label="Background">
              <SwatchGrid
                value={layer.bg_color_key}
                onChange={(key) => onUpdate({ bg_color_key: key })}
                palette={palette}
                allowNone
              />
            </Field>

            <Field label={`Radius · ${layer.radius_pct ?? 0}%`}>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={layer.radius_pct ?? 0}
                onChange={(e) => onUpdate({ radius_pct: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
          </>
        )}

        <Field label={`Rotation · ${Math.round(layer.rotation)}°`}>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={layer.rotation}
            onChange={(e) => onUpdate({ rotation: Number(e.target.value) })}
            className="w-full"
          />
        </Field>

        <Field label={`Opacity · ${Math.round(layer.opacity * 100)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.opacity}
            onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
            className="w-full"
          />
        </Field>

        <Field label="Position &amp; size">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="X" value={layer.x} onChange={(v) => onUpdate({ x: clamp01(v) })} />
            <NumberField label="Y" value={layer.y} onChange={(v) => onUpdate({ y: clamp01(v) })} />
            <NumberField label="W" value={layer.w} onChange={(v) => onUpdate({ w: clamp01(v) })} />
            <NumberField label="H" value={layer.h} onChange={(v) => onUpdate({ h: clamp01(v) })} />
          </div>
        </Field>
      </div>
    </div>
  )
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={value.toFixed(2)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  )
}

function SwatchGrid({
  value,
  onChange,
  palette,
  allowNone,
}: {
  value: ColorKey | undefined
  onChange: (key: ColorKey | undefined) => void
  palette: BrandPalette
  allowNone?: boolean
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title="None"
          className={`relative h-7 rounded border ${
            value === undefined ? 'border-primary ring-2 ring-primary/30' : 'border-border'
          } bg-[repeating-linear-gradient(45deg,#fff_0_3px,#e5e7eb_3px_6px)]`}
        >
          <span className="sr-only">None</span>
        </button>
      )}
      {COLOR_KEYS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          title={label}
          className={`h-7 rounded border ${
            value === key ? 'border-primary ring-2 ring-primary/30' : 'border-border'
          }`}
          style={{ background: resolve(key, palette) }}
        >
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}

interface AlignOption<V> {
  value: V
  icon: React.ComponentType<{ className?: string }>
  label: string
}

function AlignGroup<V extends string>({
  value,
  onChange,
  options,
}: {
  value: V
  onChange: (v: V) => void
  options: AlignOption<V>[]
}) {
  return (
    <div className="grid grid-cols-3 gap-1" role="radiogroup">
      {options.map(({ value: optVal, icon: Icon, label }) => (
        <Button
          key={optVal}
          variant={value === optVal ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(optVal)}
          aria-label={label}
          aria-pressed={value === optVal}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
}
