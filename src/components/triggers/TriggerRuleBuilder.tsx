// T045 — Trigger rule builder form (create / edit contextual triggers)
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ContextualTrigger, ContentTemplate, ShirtProduct, TriggerType } from '@/lib/types'

interface TriggerRuleBuilderProps {
  initial?: Partial<ContextualTrigger>
  onSave: (data: Omit<ContextualTrigger, 'id' | 'last_fired_at'>) => void
  onCancel: () => void
}

const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: 'weather', label: 'Weather' },
  { value: 'event', label: 'Event' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'seasonal', label: 'Seasonal' },
]

const WEATHER_CONDITIONS = [
  'sunny',
  'cloudy',
  'rainy',
  'windy',
  'snowy',
  'foggy',
  'stormy',
  'overcast',
]

const UK_HOLIDAYS = [
  "New Year's Day",
  'Good Friday',
  'Easter Monday',
  'Early May Bank Holiday',
  'Spring Bank Holiday',
  'Summer Bank Holiday',
  'Christmas Day',
  'Boxing Day',
  "Valentine's Day",
  "Mother's Day",
  "Father's Day",
  'Halloween',
]

async function fetchShirts(): Promise<ShirtProduct[]> {
  const { data, error } = await supabase
    .from('shirt_products')
    .select('id, name')
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ShirtProduct[]
}

async function fetchTemplates(): Promise<ContentTemplate[]> {
  const { data, error } = await supabase
    .from('content_templates')
    .select('id, name, platform')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ContentTemplate[]
}

export function TriggerRuleBuilder({ initial, onSave, onCancel }: TriggerRuleBuilderProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [triggerType, setTriggerType] = useState<TriggerType>(initial?.trigger_type ?? 'weather')

  // Weather conditions
  const initialConditions = (initial?.conditions ?? {}) as Record<string, unknown>
  const [tempMin, setTempMin] = useState<string>(
    initialConditions.temp_min !== undefined ? String(initialConditions.temp_min) : '',
  )
  const [tempMax, setTempMax] = useState<string>(
    initialConditions.temp_max !== undefined ? String(initialConditions.temp_max) : '',
  )
  const [weatherCondition, setWeatherCondition] = useState<string>(
    typeof initialConditions.condition === 'string' ? initialConditions.condition : '',
  )

  // Event keywords
  const [eventKeywordsRaw, setEventKeywordsRaw] = useState<string>(
    Array.isArray(initialConditions.keywords)
      ? (initialConditions.keywords as string[]).join(', ')
      : '',
  )

  // Holiday selection
  const [selectedHoliday, setSelectedHoliday] = useState<string>(
    typeof initialConditions.holiday === 'string' ? initialConditions.holiday : '',
  )

  // Shirt mapping
  const [selectedShirts, setSelectedShirts] = useState<string[]>(initial?.matched_shirts ?? [])

  // Template
  const [templateId, setTemplateId] = useState<string>(initial?.content_template_id ?? '')

  // Settings
  const [cooldownHours, setCooldownHours] = useState<string>(
    String(initial?.cooldown_hours ?? 24),
  )
  const [autoApprove, setAutoApprove] = useState<boolean>(false)
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true)

  const { data: shirts = [] } = useQuery<ShirtProduct[], Error>({
    queryKey: ['shirts', 'list'],
    queryFn: fetchShirts,
    staleTime: 1000 * 60 * 5,
  })

  const { data: templates = [] } = useQuery<ContentTemplate[], Error>({
    queryKey: ['content-templates', 'list'],
    queryFn: fetchTemplates,
    staleTime: 1000 * 60 * 5,
  })

  function toggleShirt(id: string) {
    setSelectedShirts((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function buildConditions(): Record<string, unknown> {
    if (triggerType === 'weather') {
      const cond: Record<string, unknown> = {}
      if (tempMin !== '') cond.temp_min = Number(tempMin)
      if (tempMax !== '') cond.temp_max = Number(tempMax)
      if (weatherCondition) cond.condition = weatherCondition
      return cond
    }
    if (triggerType === 'event') {
      return {
        keywords: eventKeywordsRaw
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      }
    }
    if (triggerType === 'holiday') {
      return { holiday: selectedHoliday }
    }
    return {}
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const payload: Omit<ContextualTrigger, 'id' | 'last_fired_at'> = {
      name,
      trigger_type: triggerType,
      conditions: buildConditions(),
      matched_shirts: selectedShirts,
      content_template_id: templateId || null,
      is_active: isActive,
      cooldown_hours: Math.max(1, Number(cooldownHours) || 24),
    }

    onSave(payload)
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="trigger-name" className={labelClass}>
          Rule name
        </label>
        <input
          id="trigger-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Hot summer days"
          required
          className={inputClass}
        />
      </div>

      {/* Trigger type */}
      <div>
        <label htmlFor="trigger-type" className={labelClass}>
          Trigger type
        </label>
        <select
          id="trigger-type"
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as TriggerType)}
          className={inputClass}
        >
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Conditions — weather */}
      {triggerType === 'weather' && (
        <fieldset className="rounded-md border border-border p-4 space-y-4">
          <legend className="text-xs font-semibold text-muted-foreground px-1">
            Weather conditions
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="temp-min" className={labelClass}>
                Min temp (°C)
              </label>
              <input
                id="temp-min"
                type="number"
                value={tempMin}
                onChange={(e) => setTempMin(e.target.value)}
                placeholder="e.g. 18"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="temp-max" className={labelClass}>
                Max temp (°C)
              </label>
              <input
                id="temp-max"
                type="number"
                value={tempMax}
                onChange={(e) => setTempMax(e.target.value)}
                placeholder="e.g. 35"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="weather-condition" className={labelClass}>
              Weather condition
            </label>
            <select
              id="weather-condition"
              value={weatherCondition}
              onChange={(e) => setWeatherCondition(e.target.value)}
              className={inputClass}
            >
              <option value="">Any condition</option>
              {WEATHER_CONDITIONS.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      )}

      {/* Conditions — event */}
      {triggerType === 'event' && (
        <fieldset className="rounded-md border border-border p-4 space-y-4">
          <legend className="text-xs font-semibold text-muted-foreground px-1">
            Event conditions
          </legend>
          <div>
            <label htmlFor="event-keywords" className={labelClass}>
              Event keywords
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                (comma-separated)
              </span>
            </label>
            <input
              id="event-keywords"
              type="text"
              value={eventKeywordsRaw}
              onChange={(e) => setEventKeywordsRaw(e.target.value)}
              placeholder="e.g. concert, festival, outdoor"
              className={inputClass}
            />
          </div>
        </fieldset>
      )}

      {/* Conditions — holiday */}
      {triggerType === 'holiday' && (
        <fieldset className="rounded-md border border-border p-4 space-y-4">
          <legend className="text-xs font-semibold text-muted-foreground px-1">
            Holiday
          </legend>
          <div>
            <label htmlFor="holiday-select" className={labelClass}>
              Select holiday
            </label>
            <select
              id="holiday-select"
              value={selectedHoliday}
              onChange={(e) => setSelectedHoliday(e.target.value)}
              className={inputClass}
            >
              <option value="">Choose a holiday…</option>
              {UK_HOLIDAYS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      )}

      {/* Shirt mapping */}
      <div>
        <p className={labelClass}>Promote these shirts</p>
        {shirts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading shirts…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-md border border-border p-3">
            {shirts.map((shirt) => (
              <label key={shirt.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedShirts.includes(shirt.id)}
                  onChange={() => toggleShirt(shirt.id)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-sm text-foreground truncate">{shirt.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Content template */}
      <div>
        <label htmlFor="template-select" className={labelClass}>
          Content template
          <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <select
          id="template-select"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className={inputClass}
        >
          <option value="">None — generate fresh</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.platform})
            </option>
          ))}
        </select>
      </div>

      {/* Cooldown */}
      <div>
        <label htmlFor="cooldown-hours" className={labelClass}>
          Cooldown period (hours)
        </label>
        <input
          id="cooldown-hours"
          type="number"
          min={1}
          max={720}
          value={cooldownHours}
          onChange={(e) => setCooldownHours(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Minimum hours between firings of this rule.
        </p>
      </div>

      {/* Auto-approve */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={autoApprove}
          onClick={() => setAutoApprove((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            autoApprove ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              autoApprove ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium text-foreground">Auto-approve campaigns</p>
          <p className="text-xs text-muted-foreground">
            Campaigns fired by this trigger will skip manual review.
          </p>
        </div>
      </div>

      {/* Active */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isActive ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium text-foreground">Active</p>
          <p className="text-xs text-muted-foreground">Inactive rules are never evaluated.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Save trigger
        </button>
      </div>
    </form>
  )
}
