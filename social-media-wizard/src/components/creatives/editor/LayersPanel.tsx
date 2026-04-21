import type { DesignLayer } from '@/lib/design-spec'
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  layers: DesignLayer[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onToggleHidden: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onAdd: (kind: DesignLayer['kind']) => void
}

const KIND_LABELS: Record<DesignLayer['kind'], string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  cta: 'CTA pill',
  chip: 'Chip',
  logo: 'Logo',
}

export function LayersPanel({
  layers,
  selectedId,
  onSelect,
  onToggleHidden,
  onDelete,
  onMove,
  onAdd,
}: Props) {
  return (
    <div className="flex h-full flex-col" data-slot="layers-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Layers</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm ${
              layer.id === selectedId
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-transparent hover:bg-muted/50 text-foreground'
            }`}
          >
            <button
              className="flex-1 text-left truncate"
              onClick={() => onSelect(layer.id)}
              title={layer.content ?? KIND_LABELS[layer.kind]}
            >
              <span className="font-medium">{KIND_LABELS[layer.kind]}</span>
              {layer.content && (
                <span className="text-xs text-muted-foreground ml-2 truncate">{layer.content}</span>
              )}
            </button>
            <Button variant="ghost" size="icon-xs" aria-label="Move up" onClick={() => onMove(layer.id, 'up')}>
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Move down" onClick={() => onMove(layer.id, 'down')}>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label={layer.hidden ? 'Show' : 'Hide'} onClick={() => onToggleHidden(layer.id)}>
              {layer.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon-xs" aria-label="Delete" onClick={() => onDelete(layer.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {layers.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            No layers yet. Add one below, or click "Suggest first version" to seed a starter design.
          </p>
        )}
      </div>

      <div className="border-t border-border p-2 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 mb-1">
          Add
        </p>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(KIND_LABELS) as DesignLayer['kind'][]).map((kind) => (
            <Button
              key={kind}
              variant="outline"
              size="sm"
              onClick={() => onAdd(kind)}
              className="w-full"
            >
              <Plus className="h-3 w-3" />
              {KIND_LABELS[kind]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
