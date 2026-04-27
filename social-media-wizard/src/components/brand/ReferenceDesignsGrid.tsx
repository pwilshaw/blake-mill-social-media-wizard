import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Trash2, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import {
  listReferenceDesigns,
  uploadReferenceDesign,
  deleteReferenceDesign,
  reorderReferenceDesign,
  updateReferenceCaption,
} from '@/lib/brand/api'
import type { BrandReferenceDesign } from '@/lib/types'

export function ReferenceDesignsGrid() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const refsQuery = useQuery<BrandReferenceDesign[], Error>({
    queryKey: ['brand_reference_designs'],
    queryFn: listReferenceDesigns,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadReferenceDesign(file),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['brand_reference_designs'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (design: BrandReferenceDesign) => deleteReferenceDesign(design),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brand_reference_designs'] }),
    onError: (e: Error) => setError(e.message),
  })

  const reorderMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      reorderReferenceDesign(refsQuery.data ?? [], id, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brand_reference_designs'] }),
    onError: (e: Error) => setError(e.message),
  })

  const captionMutation = useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string | null }) =>
      updateReferenceCaption(id, caption),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brand_reference_designs'] }),
    onError: (e: Error) => setError(e.message),
  })

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    for (const f of files) uploadMutation.mutate(f)
    e.target.value = ''
  }

  const designs = refsQuery.data ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Reference designs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Screenshots of social-media designs you want the brand to look like. The first three are sent to Claude when generating creative copy as visual context. Visible to you in the Templates editor as a moodboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          onChange={onPick}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {refsQuery.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {!refsQuery.isLoading && designs.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 py-10 text-center">
          <p className="text-sm text-foreground">No reference designs yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a few target screenshots to give the AI a visual sense of what you're going for.
          </p>
        </div>
      )}

      {designs.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((d, i) => {
            const isInVisionPool = i < 3
            return (
              <ReferenceCard
                key={d.id}
                design={d}
                isInVisionPool={isInVisionPool}
                isFirst={i === 0}
                isLast={i === designs.length - 1}
                onMoveUp={() => reorderMutation.mutate({ id: d.id, direction: 'up' })}
                onMoveDown={() => reorderMutation.mutate({ id: d.id, direction: 'down' })}
                onDelete={() => {
                  if (window.confirm('Delete this reference design?')) deleteMutation.mutate(d)
                }}
                onSaveCaption={(caption) => captionMutation.mutate({ id: d.id, caption })}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

function ReferenceCard({
  design,
  isInVisionPool,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onSaveCaption,
}: {
  design: BrandReferenceDesign
  isInVisionPool: boolean
  isFirst: boolean
  isLast: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onSaveCaption: (caption: string | null) => void
}) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [draftCaption, setDraftCaption] = useState(design.caption ?? '')

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="relative aspect-square bg-muted">
        <img src={design.url} alt={design.caption ?? 'Reference design'} className="h-full w-full object-cover" />
        {isInVisionPool && (
          <span className="absolute top-2 left-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
            Sent to AI
          </span>
        )}
      </div>
      <div className="p-2.5 space-y-2">
        {editingCaption ? (
          <div className="flex items-center gap-1.5">
            <input
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => {
                onSaveCaption(draftCaption.trim() === '' ? null : draftCaption.trim())
                setEditingCaption(false)
              }}
              className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftCaption(design.caption ?? '')
                setEditingCaption(false)
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingCaption(true)}
            className="flex w-full items-center justify-between gap-2 text-left text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{design.caption ?? '(no caption)'}</span>
            <Pencil className="h-3 w-3 flex-shrink-0" />
          </button>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label="Move up"
              className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={isLast}
              aria-label="Move down"
              className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
