import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus, Copy, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import {
  fetchDesignTemplates,
  deleteDesignTemplate,
  createDesignTemplate,
} from '@/lib/design-templates-api'
import type { DesignTemplate } from '@/lib/types'

export default function CreativeTemplates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: templates = [], isLoading, error } = useQuery<DesignTemplate[], Error>({
    queryKey: ['design_templates'],
    queryFn: fetchDesignTemplates,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDesignTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['design_templates'] }),
  })

  const duplicateMutation = useMutation({
    mutationFn: async (tpl: DesignTemplate) =>
      createDesignTemplate({
        name: `${tpl.name} (copy)`,
        description: tpl.description,
        design_spec: tpl.design_spec,
        palette_snapshot: tpl.palette_snapshot,
        thumbnail_url: tpl.thumbnail_url,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['design_templates'] }),
  })

  function handleDelete(tpl: DesignTemplate) {
    if (!confirm(`Delete template "${tpl.name}"? This can't be undone.`)) return
    deleteMutation.mutate(tpl.id)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Creative Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design once, re-use across campaigns. Auto-resizes for every platform.
          </p>
        </div>
        <Button onClick={() => navigate('/creative-templates/new')}>
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {!isLoading && templates.length === 0 && (
        <EmptyState
          icon={<Layers className="h-6 w-6" />}
          title="No templates yet"
          description="Templates define the look of your ads and posts. Create one and use it across campaigns — we'll auto-resize for each platform."
          action={{ label: 'Create your first template', onClick: () => navigate('/creative-templates/new') }}
        />
      )}

      {templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card"
            >
              <Link
                to={`/creative-templates/${tpl.id}`}
                className="block aspect-square bg-muted"
              >
                {tpl.thumbnail_url ? (
                  <img
                    src={tpl.thumbnail_url}
                    alt={tpl.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Layers className="h-10 w-10" />
                  </div>
                )}
              </Link>
              <div className="flex items-center justify-between gap-2 border-t border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tpl.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Duplicate"
                    onClick={() => duplicateMutation.mutate(tpl)}
                    disabled={duplicateMutation.isPending}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete"
                    onClick={() => handleDelete(tpl)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
