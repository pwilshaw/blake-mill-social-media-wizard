import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Palette } from 'lucide-react'
import { BrandAssets } from '@/components/integrations/BrandAssets'
import { ReferenceDesignsGrid } from '@/components/brand/ReferenceDesignsGrid'
import { getBrand, updateBrandText } from '@/lib/brand/api'
import type { ShopBrand } from '@/lib/types'

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono'

export default function Brand() {
  const queryClient = useQueryClient()
  const brandQuery = useQuery<ShopBrand | null, Error>({
    queryKey: ['shop_brand'],
    queryFn: getBrand,
  })

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Brand</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One source of truth for how the brand sounds and looks. Every Claude call that speaks as the brand reads from here.
          </p>
        </div>
      </header>

      {brandQuery.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {brandQuery.error.message}
        </div>
      )}

      <BrandAssets />

      <BrandTextSection
        brand={brandQuery.data ?? null}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['shop_brand'] })}
      />

      <ReferenceDesignsGrid />
    </div>
  )
}

interface TextProps {
  brand: ShopBrand | null
  onSaved: () => void
}

function BrandTextSection({ brand, onSaved }: TextProps) {
  const [tone, setTone] = useState(brand?.tone_of_voice ?? '')
  const [guidelines, setGuidelines] = useState(brand?.brand_guidelines ?? '')
  const [dosDonts, setDosDonts] = useState(brand?.dos_donts ?? '')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Re-hydrate when the brand row arrives from the query.
  useEffect(() => {
    if (brand) {
      setTone(brand.tone_of_voice ?? '')
      setGuidelines(brand.brand_guidelines ?? '')
      setDosDonts(brand.dos_donts ?? '')
    }
  }, [brand?.id, brand?.updated_at, brand])

  const save = useMutation({
    mutationFn: () =>
      updateBrandText({
        tone_of_voice: tone.trim() || null,
        brand_guidelines: guidelines.trim() || null,
        dos_donts: dosDonts.trim() || null,
      }),
    onSuccess: () => {
      setSavedAt(Date.now())
      onSaved()
    },
  })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Voice and guidelines</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Free-text, edited and saved together. Injected at the top of every brand-voiced Claude prompt.
          </p>
        </div>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      {save.error && (
        <p className="text-xs text-destructive">{(save.error as Error).message}</p>
      )}
      {savedAt && !save.isPending && (
        <p className="text-[11px] text-emerald-700">Saved {new Date(savedAt).toLocaleTimeString()}.</p>
      )}

      <Field
        label="Tone of voice"
        hint="How the brand sounds. One paragraph is plenty — short, opinionated."
      >
        <textarea
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          rows={5}
          placeholder="Witty, culturally aware, irreverent but tasteful. Reads like a thoughtful friend, not a marketer. UK English, sentences short."
          className={INPUT_CLASS}
        />
      </Field>

      <Field
        label="Brand guidelines"
        hint="Typography, voice rules, what the brand cares about. Anything Claude should know."
      >
        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          rows={6}
          placeholder="Always reference Made in Britain when relevant. Never use exclamation marks. Reference price plainly — no 'only £45'. Avoid generic phrases like 'elevate your wardrobe'."
          className={INPUT_CLASS}
        />
      </Field>

      <Field
        label="Do's and Don'ts"
        hint="One rule per line. Prefix with 'Do:' or 'Don't:' if helpful."
      >
        <textarea
          value={dosDonts}
          onChange={(e) => setDosDonts(e.target.value)}
          rows={6}
          placeholder={`Do: be specific\nDon't: use exclamation marks\nDo: reference the fabric or fit\nDon't: claim 'best ever'`}
          className={INPUT_CLASS}
        />
      </Field>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      {children}
    </label>
  )
}
