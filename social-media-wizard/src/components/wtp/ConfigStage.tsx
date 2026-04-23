import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, FlaskConical, Briefcase, ShoppingBag } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/contexts/AppContext'
import {
  defaultPersonaForStudyType,
  personasForStudyType,
  ALL_PERSONAS,
} from '@/lib/wtp/personas'
import type {
  Platform,
  PersonaKey,
  StudyType,
  WtpConfig,
  WtpFeature,
  WtpResponsesPerSet,
} from '@/lib/types'

interface Props {
  onRun: (args: {
    name: string
    persona_key: PersonaKey
    system_message: string
    config: WtpConfig
  }) => void
  isSubmitting?: boolean
}

const RESPONSES_OPTIONS: WtpResponsesPerSet[] = [25, 50, 100]

function newFeatureId(): string {
  return `f_${Math.random().toString(36).slice(2, 8)}`
}

async function fetchPresence(): Promise<{ hasShopify: boolean; hasKlaviyo: boolean }> {
  const [shopifyResp, klaviyoResp] = await Promise.all([
    supabase
      .from('shopify_stores')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('integration_credentials')
      .select('provider')
      .eq('provider', 'klaviyo')
      .maybeSingle(),
  ])
  return {
    hasShopify: Boolean(shopifyResp.data),
    hasKlaviyo: Boolean(klaviyoResp.data),
  }
}

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export function ConfigStage({ onRun, isSubmitting }: Props) {
  const { channels } = useApp()

  const presenceQuery = useQuery({
    queryKey: ['wtp', 'presence'],
    queryFn: fetchPresence,
  })

  const activeChannels: Platform[] = channels.filter((c) => c.is_active).map((c) => c.platform)
  const hasShopify = Boolean(presenceQuery.data?.hasShopify) || activeChannels.includes('shopify')
  const hasKlaviyo = Boolean(presenceQuery.data?.hasKlaviyo)

  const [studyType, setStudyType] = useState<StudyType>('saas')

  const detectedPersona: PersonaKey = useMemo(
    () => defaultPersonaForStudyType(studyType, { activeChannels, hasShopify, hasKlaviyo }),
    [studyType, activeChannels, hasShopify, hasKlaviyo],
  )

  const [name, setName] = useState('Untitled WTP study')
  const [productName, setProductName] = useState('')
  const [p1, setP1] = useState<string>('9')
  const [p2, setP2] = useState<string>('19')
  const [p3, setP3] = useState<string>('39')
  const [features, setFeatures] = useState<WtpFeature[]>([
    { id: newFeatureId(), label: '' },
    { id: newFeatureId(), label: '' },
    { id: newFeatureId(), label: '' },
  ])
  const [responsesPerSet, setResponsesPerSet] = useState<WtpResponsesPerSet>(50)
  const [personaKey, setPersonaKey] = useState<PersonaKey>(detectedPersona)
  const [systemMessage, setSystemMessage] = useState<string>(ALL_PERSONAS[detectedPersona].system_message)

  // Re-sync persona + system message when detected persona changes (e.g. toggling study type).
  useEffect(() => {
    setPersonaKey(detectedPersona)
    setSystemMessage(ALL_PERSONAS[detectedPersona].system_message)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedPersona])

  // When study type flips, default sensible prices.
  useEffect(() => {
    if (studyType === 'physical') {
      setP1('45'); setP2('65'); setP3('95')
    } else {
      setP1('9'); setP2('19'); setP3('39')
    }
  }, [studyType])

  function addFeature() {
    if (features.length >= 5) return
    setFeatures((xs) => [...xs, { id: newFeatureId(), label: '' }])
  }
  function removeFeature(id: string) {
    setFeatures((xs) => xs.filter((f) => f.id !== id))
  }
  function updateFeatureLabel(id: string, label: string) {
    setFeatures((xs) => xs.map((f) => (f.id === id ? { ...f, label } : f)))
  }

  function handlePersonaChange(next: PersonaKey) {
    setPersonaKey(next)
    setSystemMessage(ALL_PERSONAS[next].system_message)
  }

  const priceValid = [p1, p2, p3].every((v) => !Number.isNaN(Number(v)) && Number(v) > 0)
  const featuresValid = features.length > 0 && features.every((f) => f.label.trim().length > 0)
  const canRun = productName.trim() && priceValid && featuresValid && !isSubmitting

  function handleSubmit() {
    if (!canRun) return
    const config: WtpConfig = {
      study_type: studyType,
      product_name: productName.trim(),
      price_points: [Number(p1), Number(p2), Number(p3)] as [number, number, number],
      features: features.map((f) => ({ id: f.id, label: f.label.trim() })),
      responses_per_set: responsesPerSet,
    }
    onRun({ name: name.trim() || 'Untitled WTP study', persona_key: personaKey, system_message: systemMessage, config })
  }

  const estCost = (responsesPerSet * 0.002).toFixed(2)
  const isPhysical = studyType === 'physical'

  const productLabel = isPhysical ? 'Product name' : 'Product or plan name'
  const productPlaceholder = isPhysical ? 'e.g. The Oxford Shirt' : 'e.g. Blake Mill Plus'
  const priceLabel = isPhysical ? 'Price points (£, one-off)' : 'Price points (£ / mo)'
  const featuresLabel = isPhysical
    ? `Attributes (up to 5) · ${features.length}`
    : `Features (up to 5) · ${features.length}`
  const featurePlaceholder = isPhysical
    ? 'e.g. Made in Britain, Monogram, Limited edition'
    : 'Feature name'
  const personaOptions = personasForStudyType(studyType)
  const runButtonLabel = isPhysical
    ? `Run study (${responsesPerSet} shoppers)`
    : `Run study (${responsesPerSet} responses)`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Configure study</h2>
          <p className="text-xs text-muted-foreground">
            {isPhysical
              ? `Simulates ${responsesPerSet} shoppers evaluating pairs of your product configurations.`
              : `Simulates ${responsesPerSet} buyers evaluating pairs of your plan configurations.`}
          </p>
        </div>
      </div>

      {/* Study type toggle */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Study type
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setStudyType('saas')}
            aria-pressed={!isPhysical}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              !isPhysical
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-background hover:bg-muted/30'
            }`}
          >
            <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">SaaS / subscription</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plan evaluations at £/mo. Business-owner personas.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setStudyType('physical')}
            aria-pressed={isPhysical}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              isPhysical
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-background hover:bg-muted/30'
            }`}
          >
            <ShoppingBag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Physical product</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                One-off purchases. Consumer shopper personas.
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Study name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label={productLabel}>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={productPlaceholder}
            className={INPUT_CLASS}
          />
        </Field>
      </div>

      <Field label={priceLabel}>
        <div className="grid grid-cols-3 gap-2">
          {[p1, p2, p3].map((v, i) => (
            <div key={i} className="relative">
              <span className="absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">£</span>
              <input
                type="number"
                min="1"
                step="1"
                value={v}
                onChange={(e) => {
                  const setter = [setP1, setP2, setP3][i]
                  setter(e.target.value)
                }}
                className="w-full rounded-md border border-input bg-background pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      </Field>

      <Field label={featuresLabel}>
        <div className="space-y-2">
          {features.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <input
                value={f.label}
                onChange={(e) => updateFeatureLabel(f.id, e.target.value)}
                placeholder={featurePlaceholder}
                className={`${INPUT_CLASS} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeFeature(f.id)}
                disabled={features.length === 1}
                aria-label="Remove feature"
                className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {features.length < 5 && (
            <button
              type="button"
              onClick={addFeature}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Plus className="h-3 w-3" />
              {isPhysical ? 'Add attribute' : 'Add feature'}
            </button>
          )}
        </div>
        {isPhysical && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Each attribute is binary (included or not in the option shown). For multi-level
            attributes (e.g. fabric = oxford / linen / poplin) list them as separate binaries
            for v1.
          </p>
        )}
      </Field>

      <Field label={isPhysical ? 'Shoppers per study' : 'Responses per study'}>
        <div className="flex gap-1 rounded-md border border-border p-0.5 w-fit">
          {RESPONSES_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setResponsesPerSet(n)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                responsesPerSet === n
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Estimated cost: ~US${estCost} at Sonnet 4.6 rates. 50+ recommended for reliable signal.
        </p>
      </Field>

      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Persona</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPhysical
                ? 'Pick the shopper type you want to simulate. Edit freely below.'
                : 'Auto-detected from your active integrations. Edit freely below.'}
            </p>
          </div>
          <select
            value={personaKey}
            onChange={(e) => handlePersonaChange(e.target.value as PersonaKey)}
            className={`${INPUT_CLASS} max-w-xs`}
          >
            {(Object.keys(personaOptions) as PersonaKey[]).map((k) => (
              <option key={k} value={k}>
                {personaOptions[k].label}
                {!isPhysical && k === detectedPersona ? ' (detected)' : ''}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={systemMessage}
          onChange={(e) => setSystemMessage(e.target.value)}
          rows={6}
          className={`${INPUT_CLASS} font-mono text-xs`}
          aria-label="System message"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canRun}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Starting…' : runButtonLabel}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}
