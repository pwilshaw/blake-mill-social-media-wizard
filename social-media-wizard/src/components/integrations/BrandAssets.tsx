import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ShopBrand } from '@/lib/types'
import { Upload, Trash2, Check, Image as ImageIcon } from 'lucide-react'

async function fetchBrand(): Promise<ShopBrand | null> {
  const { data, error } = await supabase
    .from('shop_brand')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<ShopBrand>()
  if (error) throw new Error(error.message)
  return data ?? null
}

async function uploadLogo(file: File, kind: 'square' | 'wide'): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `logos/${kind}-${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('brand-assets')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw new Error(upErr.message)
  const { data } = supabase.storage.from('brand-assets').getPublicUrl(path)
  return data.publicUrl
}

async function saveBrand(patch: Partial<ShopBrand>): Promise<void> {
  // Upsert — use any existing row's shop_domain, or 'local' as the sentinel.
  const existing = await fetchBrand()
  const shop_domain = existing?.shop_domain ?? 'local'
  const { error } = await supabase
    .from('shop_brand')
    .upsert(
      {
        shop_domain,
        ...existing,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shop_domain' },
    )
  if (error) throw new Error(error.message)
}

interface SlotProps {
  kind: 'square' | 'wide'
  label: string
  hint: string
  currentUrl: string | null
  onUpload: (file: File) => void
  onRemove: () => void
  isUploading: boolean
  isRemoving: boolean
}

function LogoSlot({ kind, label, hint, currentUrl, onUpload, onRemove, isUploading, isRemoving }: SlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
        {currentUrl && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
            <Check className="h-3 w-3" />
            Set
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex-shrink-0 rounded-md border border-border bg-muted/30 flex items-center justify-center ${
            kind === 'square' ? 'h-20 w-20' : 'h-14 w-32'
          }`}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={`${label} preview`}
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handlePick}
            className="hidden"
            aria-label={`Upload ${label}`}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            {isUploading ? 'Uploading…' : currentUrl ? 'Replace' : 'Upload'}
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isRemoving}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-destructive hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function BrandAssets() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const brandQuery = useQuery({ queryKey: ['shop_brand'], queryFn: fetchBrand })

  const uploadMutation = useMutation({
    mutationFn: async (args: { file: File; kind: 'square' | 'wide' }) => {
      const url = await uploadLogo(args.file, args.kind)
      await saveBrand(args.kind === 'square' ? { square_logo_url: url } : { logo_url: url })
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['shop_brand'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const removeMutation = useMutation({
    mutationFn: async (kind: 'square' | 'wide') => {
      await saveBrand(kind === 'square' ? { square_logo_url: null } : { logo_url: null })
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['shop_brand'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  const brand = brandQuery.data
  const fromShopify = brand?.shop_domain && brand.shop_domain !== 'local'

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Brand logos</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Used by the Templates editor for logo layers and the brand palette. Shopify's{' '}
            <code className="font-mono">shop.brand</code> is pulled automatically when you sync the
            Shopify channel — uploads here win locally until the next sync overwrites them.
          </p>
          {fromShopify && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Synced from <code className="font-mono">{brand?.shop_domain}</code>.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <LogoSlot
          kind="square"
          label="Square logo"
          hint="Used in the corner of designs. 1:1 ratio works best."
          currentUrl={brand?.square_logo_url ?? null}
          onUpload={(file) => uploadMutation.mutate({ file, kind: 'square' })}
          onRemove={() => removeMutation.mutate('square')}
          isUploading={uploadMutation.isPending && uploadMutation.variables?.kind === 'square'}
          isRemoving={removeMutation.isPending && removeMutation.variables === 'square'}
        />
        <LogoSlot
          kind="wide"
          label="Wide logo"
          hint="Used in horizontal layouts. 3:1–4:1 ratio works best."
          currentUrl={brand?.logo_url ?? null}
          onUpload={(file) => uploadMutation.mutate({ file, kind: 'wide' })}
          onRemove={() => removeMutation.mutate('wide')}
          isUploading={uploadMutation.isPending && uploadMutation.variables?.kind === 'wide'}
          isRemoving={removeMutation.isPending && removeMutation.variables === 'wide'}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
