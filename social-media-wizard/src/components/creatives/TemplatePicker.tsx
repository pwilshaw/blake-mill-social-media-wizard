import { useQuery } from '@tanstack/react-query'
import { Layers, Check } from 'lucide-react'
import { fetchDesignTemplates } from '@/lib/design-templates-api'
import type { DesignTemplate } from '@/lib/types'

interface Props {
  value: string | null
  onChange: (id: string | null) => void
}

export function TemplatePicker({ value, onChange }: Props) {
  const { data: templates = [], isLoading } = useQuery<DesignTemplate[], Error>({
    queryKey: ['design_templates'],
    queryFn: fetchDesignTemplates,
  })

  return (
    <div className="space-y-3" data-slot="template-picker">
      <AutoOption selected={value === null} onSelect={() => onChange(null)} />

      {isLoading && <p className="text-sm text-muted-foreground">Loading templates…</p>}

      {!isLoading && templates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No templates saved yet. <a href="/creative-templates/new" className="text-primary underline">Create one</a> to use it in campaigns.
        </p>
      )}

      {templates.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((tpl) => {
            const selected = value === tpl.id
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onChange(tpl.id)}
                className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-background hover:bg-muted/30'
                }`}
                aria-pressed={selected}
              >
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted">
                  {tpl.thumbnail_url ? (
                    <img src={tpl.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Layers className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tpl.description ?? `${tpl.design_spec.layers.length} layer${tpl.design_spec.layers.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                {selected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AutoOption({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-background hover:bg-muted/30'
      }`}
      aria-pressed={selected}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted text-muted-foreground text-xs font-semibold uppercase tracking-widest">
        Auto
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Auto (no template)</p>
        <p className="text-xs text-muted-foreground">Use the product photo with a simple caption overlay.</p>
      </div>
      {selected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
    </button>
  )
}
