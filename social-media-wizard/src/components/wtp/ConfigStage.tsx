import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2, FlaskConical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/contexts/AppContext'
import { detectPersona, PERSONAS } from '@/lib/wtp/personas'
import type {
  Platform,
  PersonaKey,
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

export function ConfigStage({ onRun, isSubmitting }: Props) {
  const { channels } = useApp()

  const presenceQuery = useQuery({
    queryKey: ['wtp', 'presence'],
    queryFn: fetchPresence,
  })

  const activeChannels: Platform[] = channels.filter((c) => c.is_active).map((c) => c.platform)
  const hasShopify = Boolean(presenceQuery.data?.hasShopify) || activeChannels.includes('shopify')
  const hasKlaviyo = Boolean(presenceQuery.data?.hasKlaviyo)

  const detectedPersona: PersonaKey = useMemo(
    () => detectPersona({ activeChannels, hasShopify, hasKlaviyo }),
    [activeChannels, hasShopify, hasKlaviyo],
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
  const [systemMessage, setSystemMessage] = useState<string>(PERSONAS[detectedPersona].system_message)

  // Update detected persona + system message when integrations state resolves
  useEffect(() => {
    setPersonaKey(detectedPersona)
    setSystemMessage(PERSONAS[detectedPersona].system_message)
    // Intentional: only re-run when the detected key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedPersona])

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
    setSystemMessage(PERSONAS[next].system_message)
  }

  const priceValid = [p1, p2, p3].every((v) => !Number.isNaN(Number(v)) && Number(v) > 0)
  const featuresValid = features.length > 0 && features.every((f) => f.label.trim().length > 0)
  const canRun = productName.trim() && priceValid && featuresValid && !isSubmitting

  function handleSubmit() {
    if (!canRun) return
    const config: WtpConfig = {
      product_name: productName.trim(),
      price_points: [Number(p1), Number(p2), Number(p3)] as [number, number, number],
      features: features.map((f) => ({ id: f.id, label: f.label.trim() })),
      responses_per_set: responsesPerSet,
    }
    onRun({ name: name.trim() || 'Untitled WTP study', persona_key: personaKey, system_message: systemMessage, config })
  }

  // Estimated cost hint: ~400 tokens/call × N, rough.
  const estCost = (responsesPerSet * 0.002).toFixed(2)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Configure study</h2>
          <p className="text-xs text-muted-foreground">
            Simulates {responsesPerSet} buyers evaluating pairs of your plan configurations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Study name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
        <Field label="Product or plan name">
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Blake Mill Plus"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>
      </div>

      <Field label="Price points (£ / mo)">
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
                className="input pl-5"
              />
            </div>
          ))}
        </div>
      </Field>

      <Field label={`Features (up to 5) · ${features.length}`}>
        <div className="space-y-2">
          {features.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <input
                value={f.label}
                onChange={(e) => updateFeatureLabel(f.id, e.target.value)}
                placeholder="Feature name"
                className="input flex-1"
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
              Add feature
            </button>
          )}
        </div>
      </Field>

      <Field label="Responses per study">
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
              Auto-detected from your active integrations. Edit freely below.
            </p>
          </div>
          <select
            value={personaKey}
            onChange={(e) => handlePersonaChange(e.target.value as PersonaKey)}
            className="input max-w-xs"
          >
            {(Object.keys(PERSONAS) as PersonaKey[]).map((k) => (
              <option key={k} value={k}>
                {PERSONAS[k].label}{k === detectedPersona ? ' (detected)' : ''}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={systemMessage}
          onChange={(e) => setSystemMessage(e.target.value)}
          rows={6}
          className="input font-mono text-xs"
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
          {isSubmitting ? 'Starting…' : `Run study (${responsesPerSet} responses)`}
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
