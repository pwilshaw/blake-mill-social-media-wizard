// T037 — Campaign creation wizard
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/contexts/AppContext'
import type { ShirtProduct } from '@/lib/types'
import { TemplatePicker } from '@/components/creatives/TemplatePicker'

interface CampaignWizardProps {
  onComplete: (campaignId: string) => void
}

const TOTAL_STEPS = 7

const STEP_LABELS = [
  'Select shirts',
  'Choose channels',
  'Set schedule',
  'Set budget',
  'Design',
  'Generate content',
  'Review & approve',
]

// ----------------------------------------------------------------
// Supabase helpers
// ----------------------------------------------------------------

async function fetchShirts(): Promise<ShirtProduct[]> {
  const { data, error } = await supabase
    .from('shirt_products')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []) as ShirtProduct[]
}

async function createCampaign(payload: {
  name: string
  channels: string[]
  scheduled_start: string | null
  scheduled_end: string | null
  budget_limit: number | null
  shirt_ids: string[]
  design_template_id: string | null
}): Promise<string> {
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      name: payload.name,
      status: 'draft',
      campaign_type: 'manual',
      channels: payload.channels,
      scheduled_start: payload.scheduled_start,
      scheduled_end: payload.scheduled_end,
      budget_limit: payload.budget_limit,
      budget_spent: 0,
      auto_approved: false,
      target_segments: [],
      design_template_id: payload.design_template_id,
    })
    .select('id')
    .single()

  if (campaignError) throw new Error(campaignError.message)

  const campaignId = (campaign as { id: string }).id

  if (payload.shirt_ids.length > 0) {
    const links = payload.shirt_ids.map((sid, i) => ({
      campaign_id: campaignId,
      shirt_product_id: sid,
      is_primary: i === 0,
    }))
    const { error: linkError } = await supabase
      .from('campaign_shirts')
      .insert(links)
    if (linkError) throw new Error(linkError.message)
  }

  return campaignId
}

async function triggerContentGeneration(campaignId: string): Promise<void> {
  // Fetch the campaign to get its channels and linked shirts
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('channels')
    .eq('id', campaignId)
    .single()

  if (campaignError) throw new Error(campaignError.message)

  const { data: links, error: linksError } = await supabase
    .from('campaign_shirts')
    .select('shirt_product_id')
    .eq('campaign_id', campaignId)

  if (linksError) throw new Error(linksError.message)

  const shirtIds = (links ?? []).map((l: { shirt_product_id: string }) => l.shirt_product_id)
  if (shirtIds.length === 0) throw new Error('No shirts linked to this campaign')

  // Generate content for each platform (default to instagram if no channels set)
  const platforms = (campaign as { channels: string[] }).channels
  const targetPlatforms = platforms.length > 0 ? platforms : ['instagram']

  // For channel UUIDs, map to platform names via channel_accounts
  let platformNames: string[] = []
  if (targetPlatforms[0]?.includes('-')) {
    // UUIDs — look up platform names
    const { data: accounts } = await supabase
      .from('channel_accounts')
      .select('platform')
      .in('id', targetPlatforms)
    platformNames = [...new Set((accounts ?? []).map((a: { platform: string }) => a.platform))]
  } else {
    platformNames = targetPlatforms
  }

  if (platformNames.length === 0) platformNames = ['instagram']

  // Fetch search insights for SEO-optimised content
  let searchInsights: Record<string, unknown> = {}
  try {
    const searchRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-intelligence`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: 'content_angles', query: 'mens shirts UK' }),
      }
    )
    if (searchRes.ok) {
      const searchData = await searchRes.json()
      const angles = (searchData.angles ?? []) as Array<{ type: string; angle: string }>
      searchInsights = {
        trending_keywords: angles
          .filter((a: { type: string }) => a.type === 'search_term')
          .slice(0, 5)
          .map((a: { angle: string }) => a.angle),
        people_also_ask: angles
          .filter((a: { type: string }) => a.type === 'question')
          .slice(0, 3)
          .map((a: { angle: string }) => a.angle),
      }
    }
  } catch {
    // Search insights are optional — continue without them
  }

  const errors: string[] = []

  for (const platform of platformNames) {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          shirt_ids: shirtIds,
          platform,
          context_overrides: Object.keys(searchInsights).length > 0
            ? { search_insights: searchInsights }
            : undefined,
        }),
      }
    )

    if (!res.ok) {
      const err = await res.json()
      errors.push(`${platform}: ${err.error ?? 'Generation failed'}`)
    }
  }

  if (errors.length === platformNames.length) {
    throw new Error(`Content generation failed: ${errors.join('; ')}`)
  }
}

// ----------------------------------------------------------------
// Step indicator
// ----------------------------------------------------------------

interface StepIndicatorProps {
  current: number
}

function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <nav aria-label="Campaign setup progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isDone = stepNum < current
          const isActive = stepNum === current

          return (
            <li key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors ${
                    isDone
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isActive
                      ? 'border-primary text-primary bg-background'
                      : 'border-border text-muted-foreground bg-background'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <span
                  className={`hidden sm:block text-[10px] font-medium text-center leading-tight ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mt-[-14px] sm:mt-[-18px] transition-colors ${
                    isDone ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ----------------------------------------------------------------
// Main wizard
// ----------------------------------------------------------------

export function CampaignWizard({ onComplete }: CampaignWizardProps) {
  const { channels: connectedChannels } = useApp()

  const [step, setStep] = useState(1)
  const [campaignName, setCampaignName] = useState('')
  const [selectedShirtIds, setSelectedShirtIds] = useState<Set<string>>(new Set())
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')
  const [designTemplateId, setDesignTemplateId] = useState<string | null>(null)
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [generationDone, setGenerationDone] = useState(false)

  const shirtsQuery = useQuery<ShirtProduct[], Error>({
    queryKey: ['shirt_products'],
    queryFn: fetchShirts,
    enabled: step === 1,
  })

  const createMutation = useMutation<string, Error, Parameters<typeof createCampaign>[0]>({
    mutationFn: createCampaign,
    onSuccess: (id) => {
      setCreatedCampaignId(id)
      setStep(6)
    },
  })

  const generateMutation = useMutation<void, Error, string>({
    mutationFn: triggerContentGeneration,
    onSuccess: () => {
      setGenerationDone(true)
      setGenerationError(null)
    },
    onError: (err) => {
      setGenerationError(err.message)
    },
  })

  function toggleShirt(id: string, isDisabled: boolean) {
    if (isDisabled) return
    setSelectedShirtIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleChannel(id: string) {
    setSelectedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
  }

  async function handleSaveAndGenerateStep() {
    // Step 5 (Design) → 6 (Generate): create the campaign then trigger generation
    await createMutation.mutateAsync({
      name: campaignName || 'Untitled Campaign',
      channels: Array.from(selectedChannels),
      scheduled_start: scheduledStart || null,
      scheduled_end: scheduledEnd || null,
      budget_limit: budgetLimit ? Number(budgetLimit) : null,
      shirt_ids: Array.from(selectedShirtIds),
      design_template_id: designTemplateId,
    })
  }

  async function handleGenerate() {
    if (!createdCampaignId) return
    setGenerationError(null)
    await generateMutation.mutateAsync(createdCampaignId)
  }

  function handleFinish() {
    if (createdCampaignId) onComplete(createdCampaignId)
  }

  // ----------------------------------------------------------------
  // Step content
  // ----------------------------------------------------------------

  function renderStep() {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="campaign-name">
                Campaign name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Summer Bank Holiday Push"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <p className="text-sm font-medium text-foreground">Select shirts to feature</p>
            {shirtsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Loading products…</p>
            )}
            {shirtsQuery.error && (
              <p className="text-sm text-destructive">
                Failed to load shirts: {shirtsQuery.error.message}
              </p>
            )}
            {shirtsQuery.data && (
              <div className="grid gap-3 sm:grid-cols-2 max-h-96 overflow-y-auto pr-1">
                {shirtsQuery.data.map((shirt) => {
                  const isOutOfStock = shirt.stock_status === 'out_of_stock'
                  const isSelected = selectedShirtIds.has(shirt.id)

                  return (
                    <button
                      key={shirt.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => toggleShirt(shirt.id, isOutOfStock)}
                      aria-pressed={isSelected}
                      className={`relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                        isOutOfStock
                          ? 'opacity-40 cursor-not-allowed bg-muted/30 border-border'
                          : isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-background hover:bg-muted/30'
                      }`}
                    >
                      {shirt.images[0] && (
                        <img
                          src={shirt.images[0]}
                          alt={shirt.name}
                          className="h-12 w-12 rounded-md object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {shirt.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {shirt.stock_status.replace('_', ' ')}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Choose channels</p>
            {connectedChannels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No channels connected. Visit Channels to connect an account.
              </p>
            ) : (
              <div className="space-y-2">
                {connectedChannels.map((ch) => (
                  <label
                    key={ch.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedChannels.has(ch.id)}
                      onChange={() => toggleChannel(ch.id)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">
                        {ch.platform}
                      </p>
                      <p className="text-xs text-muted-foreground">{ch.account_name}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Set schedule</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="start-date"
                >
                  Start date
                </label>
                <input
                  id="start-date"
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="end-date"
                >
                  End date
                </label>
                <input
                  id="end-date"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  min={scheduledStart}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to run the campaign indefinitely or publish manually.
            </p>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Set budget limit</p>
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="budget"
              >
                Maximum spend (£)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
                  £
                </span>
                <input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank for no budget cap. The campaign will pause automatically when
              the limit is reached.
            </p>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Design</p>
            <p className="text-sm text-muted-foreground">
              Pick a saved template to use for this campaign's creatives, or keep it simple with an auto caption overlay.
            </p>
            <TemplatePicker value={designTemplateId} onChange={setDesignTemplateId} />
            {createMutation.error && (
              <p className="text-sm text-destructive">
                Error: {createMutation.error.message}
              </p>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Generate content</p>
            <p className="text-sm text-muted-foreground">
              Click the button below to generate AI content variants for each shirt and
              channel combination using the DEPTH method.
            </p>
            {!generationDone && !generateMutation.isPending && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!createdCampaignId}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate content
              </button>
            )}
            {generateMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating content, this may take a moment…
              </div>
            )}
            {generationError && (
              <p className="text-sm text-destructive">Error: {generationError}</p>
            )}
            {generationDone && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                Content variants generated successfully. Click Next to review them.
              </div>
            )}
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Review & approve</p>
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign name</span>
                <span className="font-medium">{campaignName || 'Untitled Campaign'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shirts selected</span>
                <span className="font-medium">{selectedShirtIds.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channels</span>
                <span className="font-medium capitalize">
                  {selectedChannels.size > 0
                    ? Array.from(selectedChannels)
                        .map((id) => {
                          const ch = connectedChannels.find((c) => c.id === id)
                          return ch?.platform ?? id
                        })
                        .join(', ')
                    : 'None'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Schedule</span>
                <span className="font-medium">
                  {scheduledStart
                    ? `${scheduledStart}${scheduledEnd ? ` → ${scheduledEnd}` : ''}`
                    : 'No schedule set'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget limit</span>
                <span className="font-medium">
                  {budgetLimit ? `£${Number(budgetLimit).toFixed(2)}` : 'No cap'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Content generation</span>
                <span
                  className={`font-medium ${
                    generationDone ? 'text-emerald-600' : 'text-amber-500'
                  }`}
                >
                  {generationDone ? 'Complete' : 'Not run'}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Once complete, you will be taken to the campaign detail page where you can
              review and approve individual content variants.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  // ----------------------------------------------------------------
  // Navigation logic
  // ----------------------------------------------------------------

  const canGoNext: boolean = (() => {
    if (step === 1) return selectedShirtIds.size > 0
    if (step === 2) return selectedChannels.size > 0
    if (step === 5) return !createMutation.isPending
    if (step === 6) return generationDone
    return true
  })()

  const isLastStep = step === TOTAL_STEPS
  const isSaveStep = step === 5

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">New Campaign</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Step {step} of {TOTAL_STEPS}: {STEP_LABELS[step - 1]}
          </p>
        </div>

        <StepIndicator current={step} />

        {renderStep()}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || createMutation.isPending || generateMutation.isPending}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleFinish}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Go to campaign →
            </button>
          ) : isSaveStep ? (
            <button
              type="button"
              onClick={handleSaveAndGenerateStep}
              disabled={createMutation.isPending || !canGoNext}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Saving…' : 'Save & continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
