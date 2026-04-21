import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Sparkles } from 'lucide-react'
import type { DesignLayer, DesignSpec, BrandPalette } from '@/lib/design-spec'
import { emptyDesignSpec, newLayerId, cloneSpec } from '@/lib/design-spec'
import {
  fetchDesignTemplate,
  fetchShopBrand,
  fetchShirtsForPreview,
  createDesignTemplate,
  updateDesignTemplate,
  paletteFromShopBrand,
  renderDesign,
} from '@/lib/design-templates-api'
import { suggestFirstVersion } from '@/lib/suggest-first-version'
import { DesignCanvas } from '@/components/creatives/editor/DesignCanvas'
import { LayersPanel } from '@/components/creatives/editor/LayersPanel'
import { PropertiesPanel } from '@/components/creatives/editor/PropertiesPanel'
import { RatioPreviewStrip } from '@/components/creatives/editor/RatioPreviewStrip'
import type { ShirtProduct, DesignTemplate } from '@/lib/types'

const CANVAS_SIZE = 560

export default function CreativeTemplateEditor() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const templateQuery = useQuery({
    queryKey: ['design_template', id],
    queryFn: () => fetchDesignTemplate(id ?? ''),
    enabled: !isNew,
  })

  if (!isNew && templateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Key the inner editor by the template id so local edits reset on navigation.
  const key = isNew ? 'new' : (templateQuery.data?.id ?? id ?? 'unknown')
  return (
    <EditorBody
      key={key}
      templateId={isNew ? null : id ?? null}
      initialTemplate={templateQuery.data ?? null}
    />
  )
}

interface EditorBodyProps {
  templateId: string | null
  initialTemplate: DesignTemplate | null
}

function EditorBody({ templateId, initialTemplate }: EditorBodyProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState(initialTemplate?.name ?? 'Untitled template')
  const [spec, setSpec] = useState<DesignSpec>(() => initialTemplate?.design_spec ?? emptyDesignSpec())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedShirtId, setSelectedShirtId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const brandQuery = useQuery({ queryKey: ['shop_brand'], queryFn: fetchShopBrand })
  const shirtsQuery = useQuery({ queryKey: ['shirts_for_template_preview'], queryFn: fetchShirtsForPreview })

  const palette: BrandPalette = useMemo(() => paletteFromShopBrand(brandQuery.data ?? null), [brandQuery.data])
  const isNew = templateId === null

  const previewShirt: ShirtProduct | null = useMemo(() => {
    const shirts = shirtsQuery.data ?? []
    if (shirts.length === 0) return null
    if (selectedShirtId) return shirts.find((s) => s.id === selectedShirtId) ?? shirts[0]
    return shirts[0]
  }, [shirtsQuery.data, selectedShirtId])

  const vars = useMemo(
    () => ({
      product_name: previewShirt?.name ?? 'Product name',
      price: previewShirt?.price != null ? `£${previewShirt.price.toFixed(0)}` : '£—',
      cta: 'Shop now',
    }),
    [previewShirt],
  )

  const backgroundImageUrl = previewShirt?.images?.[0] ?? null

  // ------- Spec mutations -------

  function updateLayer(layerId: string, patch: Partial<DesignLayer>) {
    setSpec((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
    }))
  }

  function deleteLayer(layerId: string) {
    setSpec((prev) => ({ ...prev, layers: prev.layers.filter((l) => l.id !== layerId) }))
    if (selectedId === layerId) setSelectedId(null)
  }

  function toggleHidden(layerId: string) {
    updateLayer(layerId, { hidden: !spec.layers.find((l) => l.id === layerId)?.hidden })
  }

  function moveLayer(layerId: string, direction: 'up' | 'down') {
    setSpec((prev) => {
      const idx = prev.layers.findIndex((l) => l.id === layerId)
      if (idx === -1) return prev
      const target = direction === 'up' ? idx + 1 : idx - 1
      if (target < 0 || target >= prev.layers.length) return prev
      const next = [...prev.layers]
      const [moved] = next.splice(idx, 1)
      next.splice(target, 0, moved)
      return { ...prev, layers: next }
    })
  }

  function addLayer(kind: DesignLayer['kind']) {
    const base: DesignLayer = {
      id: newLayerId(),
      kind,
      x: 0.3,
      y: 0.4,
      w: 0.4,
      h: 0.12,
      rotation: 0,
      opacity: 1,
      align_h: 'center',
      align_v: 'middle',
    }
    if (kind === 'title') {
      base.content = 'TITLE'
      base.weight = 'bold'
      base.size_pct = 7
      base.color_key = 'background'
      base.bg_color_key = 'primary'
      base.padding_pct = 1.5
      base.radius_pct = 8
      base.align_h = 'left'
    } else if (kind === 'subtitle') {
      base.content = 'Subtitle'
      base.weight = 'regular'
      base.size_pct = 4.5
      base.color_key = 'foreground'
      base.h = 0.08
    } else if (kind === 'cta') {
      base.content = 'Shop now'
      base.weight = 'bold'
      base.size_pct = 4
      base.color_key = 'primary'
      base.bg_color_key = 'background'
      base.padding_pct = 1.5
      base.radius_pct = 50
      base.w = 0.28
      base.h = 0.08
    } else if (kind === 'chip') {
      base.content = 'New'
      base.weight = 'bold'
      base.size_pct = 4.5
      base.color_key = 'background'
      base.bg_color_key = 'primary'
      base.padding_pct = 1.2
      base.radius_pct = 50
      base.w = 0.22
      base.h = 0.08
    } else if (kind === 'logo') {
      base.w = 0.18
      base.h = 0.18
      base.src_key = 'brand_square'
    }
    setSpec((prev) => ({ ...prev, layers: [...prev.layers, base] }))
    setSelectedId(base.id)
  }

  function handleSuggest() {
    const next = suggestFirstVersion({
      product_name: previewShirt?.name ?? null,
      price: previewShirt?.price ?? null,
      palette,
    })
    setSpec(cloneSpec(next))
    setSelectedId(null)
  }

  // ------- Save -------

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Render a 1:1 thumbnail for the library grid.
      let thumbnail_url: string | null = null
      if (backgroundImageUrl) {
        try {
          thumbnail_url = await renderDesign({
            product_image_url: backgroundImageUrl,
            aspect_ratio: '1:1',
            design_spec: spec,
            palette,
            vars,
          })
        } catch {
          // Thumbnail is nice-to-have — keep saving the spec either way.
        }
      }

      if (isNew) {
        return createDesignTemplate({
          name,
          design_spec: spec,
          palette_snapshot: palette,
          thumbnail_url,
        })
      }
      return updateDesignTemplate(templateId!, {
        name,
        design_spec: spec,
        palette_snapshot: palette,
        thumbnail_url,
      })
    },
    onSuccess: (tpl) => {
      queryClient.invalidateQueries({ queryKey: ['design_templates'] })
      if (isNew) navigate(`/creative-templates/${tpl.id}`, { replace: true })
      setSaveError(null)
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  const selectedLayer = spec.layers.find((l) => l.id === selectedId) ?? null

  const shirts = shirtsQuery.data ?? []

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate('/creative-templates')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent text-lg font-semibold text-foreground focus:outline-none min-w-0"
            aria-label="Template name"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSuggest}>
            <Sparkles className="h-4 w-4" />
            Suggest first version
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        {/* Left: layers */}
        <aside className="min-h-[400px] rounded-lg border border-border bg-card">
          <LayersPanel
            layers={spec.layers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleHidden={toggleHidden}
            onDelete={deleteLayer}
            onMove={moveLayer}
            onAdd={addLayer}
          />
        </aside>

        {/* Centre: canvas + ratio strip */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-sm font-medium text-foreground">Preview shirt</p>
            <select
              value={selectedShirtId ?? ''}
              onChange={(e) => setSelectedShirtId(e.target.value || null)}
              className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— auto —</option>
              {shirts.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-6">
            <DesignCanvas
              spec={spec}
              palette={palette}
              vars={vars}
              backgroundImageUrl={backgroundImageUrl}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdateLayer={updateLayer}
              size={CANVAS_SIZE}
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <RatioPreviewStrip
              spec={spec}
              palette={palette}
              vars={vars}
              backgroundImageUrl={backgroundImageUrl}
            />
          </div>
        </section>

        {/* Right: properties */}
        <aside className="min-h-[400px] rounded-lg border border-border bg-card">
          <PropertiesPanel layer={selectedLayer} palette={palette} onUpdate={(patch) => selectedLayer && updateLayer(selectedLayer.id, patch)} />
        </aside>
      </div>
    </div>
  )
}
