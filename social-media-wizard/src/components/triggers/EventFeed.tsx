// Event discovery feed with search, location filter, custom events, and product linking
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Search,
  MapPin,
  Plus,
  X,
  ExternalLink,
  ShoppingBag,
  Calendar,
  Music,
  Trophy,
  Sparkles,
  Tag,
  ChevronDown,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { ContextualTrigger, ShirtProduct } from '@/lib/types'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface DetectedEvent {
  id: string
  title: string
  category: string
  date: string
  relevance: number
  location?: string
}

interface CustomEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  end_date: string | null
  location: string | null
  category: string
  external_url: string | null
  linked_products: string[]
  product_urls: string[]
  notes: string | null
  is_active: boolean
}

interface EventFeedProps {
  events: DetectedEvent[]
  triggers: ContextualTrigger[]
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const UK_CITIES = [
  'All locations',
  'London',
  'Manchester',
  'Birmingham',
  'Leeds',
  'Liverpool',
  'Bristol',
  'Sheffield',
  'Edinburgh',
  'Glasgow',
  'Cardiff',
  'Newcastle',
  'Nottingham',
  'Brighton',
  'Nationwide',
]

const EVENT_CATEGORIES = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'music', label: 'Music', icon: Music },
  { value: 'sports', label: 'Sports', icon: Trophy },
  { value: 'fashion', label: 'Fashion', icon: Tag },
  { value: 'local', label: 'Local', icon: MapPin },
  { value: 'seasonal', label: 'Seasonal', icon: Calendar },
  { value: 'custom', label: 'Custom', icon: Plus },
]

const CATEGORY_COLOURS: Record<string, string> = {
  music: 'bg-pink-500/15 text-pink-700',
  sports: 'bg-green-500/15 text-green-700',
  fashion: 'bg-violet-500/15 text-violet-700',
  festival: 'bg-amber-500/15 text-amber-700',
  local: 'bg-sky-500/15 text-sky-700',
  seasonal: 'bg-orange-500/15 text-orange-700',
  custom: 'bg-blue-500/15 text-blue-700',
  outdoor: 'bg-emerald-500/15 text-emerald-700',
}

// ----------------------------------------------------------------
// Supabase helpers
// ----------------------------------------------------------------

async function fetchCustomEvents(): Promise<CustomEvent[]> {
  const { data, error } = await supabase
    .from('custom_events')
    .select('*')
    .eq('is_active', true)
    .order('event_date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CustomEvent[]
}

async function fetchProducts(): Promise<ShirtProduct[]> {
  const { data, error } = await supabase
    .from('shirt_products')
    .select('id, name, price, images, stock_status, shopify_id')
    .eq('stock_status', 'in_stock')
    .order('name')
  if (error) return []
  return (data ?? []) as ShirtProduct[]
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function relevanceColour(score: number): string {
  if (score >= 80) return 'bg-green-500/15 text-green-700'
  if (score >= 50) return 'bg-amber-500/15 text-amber-700'
  return 'bg-muted text-muted-foreground'
}

function matchedTriggers(event: DetectedEvent, triggers: ContextualTrigger[]): ContextualTrigger[] {
  return triggers.filter((trigger) => {
    if (!trigger.is_active || trigger.trigger_type !== 'event') return false
    const conditions = trigger.conditions as { keywords?: string[] }
    const keywords = conditions.keywords ?? []
    return keywords.some(
      (kw) =>
        event.title.toLowerCase().includes(kw.toLowerCase()) ||
        event.category.toLowerCase().includes(kw.toLowerCase()),
    )
  })
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function EventFeed({ events, triggers }: EventFeedProps) {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showLocationDropdown, setShowLocationDropdown] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CustomEvent | null>(null)

  const { data: customEvents = [] } = useQuery({
    queryKey: ['custom-events'],
    queryFn: fetchCustomEvents,
    staleTime: 1000 * 60 * 2,
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_events')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-events'] }),
  })

  // Merge detected + custom events
  const allEvents: (DetectedEvent & { isCustom?: boolean; customData?: CustomEvent })[] = [
    ...events.map((e) => ({ ...e, isCustom: false as const })),
    ...customEvents.map((ce) => ({
      id: ce.id,
      title: ce.title,
      category: ce.category,
      date: ce.event_date,
      relevance: 100,
      location: ce.location ?? undefined,
      isCustom: true as const,
      customData: ce,
    })),
  ]

  // Filter
  const filtered = allEvents.filter((event) => {
    const matchesSearch =
      !search ||
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.category.toLowerCase().includes(search.toLowerCase())
    const matchesLocation =
      locationFilter === 'All locations' ||
      event.location?.toLowerCase().includes(locationFilter.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' || event.category === categoryFilter
    return matchesSearch && matchesLocation && matchesCategory
  })

  // Sort: custom events first, then by date
  filtered.sort((a, b) => {
    if (a.isCustom && !b.isCustom) return -1
    if (!a.isCustom && b.isCustom) return 1
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Event Discovery</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} events · {customEvents.length} custom
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingEvent(null)
              setShowAddEvent(!showAddEvent)
            }}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </button>
        </div>

        {/* Search + filters */}
        <div className="mt-3 space-y-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Location filter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {locationFilter}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full left-0 z-20 mt-1 w-48 rounded-lg border border-border bg-card shadow-lg py-1 max-h-60 overflow-y-auto">
                  {UK_CITIES.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setLocationFilter(city)
                        setShowLocationDropdown(false)
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors ${
                        locationFilter === city ? 'font-semibold text-primary' : 'text-foreground'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category pills */}
            <div className="flex gap-1 flex-wrap flex-1">
              {EVENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                    categoryFilter === cat.value
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <cat.icon className="h-3 w-3" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit custom event form */}
      {showAddEvent && (
        <CustomEventForm
          initial={editingEvent}
          onSave={() => {
            setShowAddEvent(false)
            setEditingEvent(null)
            queryClient.invalidateQueries({ queryKey: ['custom-events'] })
          }}
          onCancel={() => {
            setShowAddEvent(false)
            setEditingEvent(null)
          }}
        />
      )}

      {/* Event list */}
      {filtered.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No events found. Try adjusting your search or filters.
        </div>
      ) : (
        <ul className="divide-y divide-border max-h-[500px] overflow-y-auto">
          {filtered.map((event) => {
            const matched = matchedTriggers(event, triggers)
            const isHighlighted = matched.length > 0

            return (
              <li
                key={event.id}
                className={`px-4 py-3 transition-colors ${
                  isHighlighted ? 'bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Relevance / custom badge */}
                  <div className="shrink-0 pt-0.5">
                    {event.isCustom ? (
                      <span className="inline-flex items-center rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        Custom
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${relevanceColour(event.relevance)}`}
                      >
                        {event.relevance}%
                      </span>
                    )}
                  </div>

                  {/* Event details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${isHighlighted ? 'text-primary' : 'text-foreground'}`}>
                        {event.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {isHighlighted && (
                          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Trigger match
                          </span>
                        )}
                        {event.isCustom && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEvent(event.customData!)
                                setShowAddEvent(true)
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete "${event.title}"?`)) {
                                  deleteEvent.mutate(event.id)
                                }
                              }}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                          CATEGORY_COLOURS[event.category] ?? 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {event.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatEventDate(event.date)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>

                    {/* Custom event extras */}
                    {event.isCustom && event.customData && (
                      <div className="mt-2 space-y-1.5">
                        {event.customData.description && (
                          <p className="text-xs text-muted-foreground">{event.customData.description}</p>
                        )}
                        {event.customData.notes && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                            {event.customData.notes}
                          </p>
                        )}
                        {event.customData.external_url && (
                          <a
                            href={event.customData.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Event link
                          </a>
                        )}
                        {event.customData.product_urls.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {event.customData.product_urls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                              >
                                <ShoppingBag className="h-3 w-3" />
                                Product {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Matched triggers */}
                    {isHighlighted && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {matched.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ----------------------------------------------------------------
// Custom Event Form
// ----------------------------------------------------------------

function CustomEventForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: CustomEvent | null
  onSave: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [eventDate, setEventDate] = useState(initial?.event_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'custom')
  const [externalUrl, setExternalUrl] = useState(initial?.external_url ?? '')
  const [productUrls, setProductUrls] = useState<string[]>(initial?.product_urls ?? [''])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [showProductPicker, setShowProductPicker] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products-for-events'],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5,
  })

  function addProductUrl(url: string) {
    setProductUrls((prev) => [...prev.filter((u) => u.trim()), url])
  }

  function removeProductUrl(index: number) {
    setProductUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!title.trim() || !eventDate) return
    setSaving(true)

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate,
      end_date: endDate || null,
      location: location.trim() || null,
      category,
      external_url: externalUrl.trim() || null,
      product_urls: productUrls.filter((u) => u.trim()),
      linked_products: [] as string[],
      notes: notes.trim() || null,
      is_active: true,
    }

    try {
      if (initial) {
        await supabase.from('custom_events').update(payload).eq('id', initial.id)
      } else {
        await supabase.from('custom_events').insert(payload)
      }
      onSave()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="border-b border-border bg-muted/30 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        {initial ? 'Edit Event' : 'Add Custom Event'}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title *"
            className={inputCls}
          />
        </div>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className={inputCls}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          placeholder="End date (optional)"
          className={inputCls}
        />
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (e.g. Manchester)"
            className={`${inputCls} pl-8`}
            list="location-suggestions"
          />
          <datalist id="location-suggestions">
            {UK_CITIES.filter((c) => c !== 'All locations').map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputCls}
        >
          <option value="custom">Custom</option>
          <option value="music">Music</option>
          <option value="sports">Sports</option>
          <option value="fashion">Fashion</option>
          <option value="local">Local</option>
          <option value="seasonal">Seasonal</option>
          <option value="festival">Festival</option>
        </select>
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className={inputCls}
      />

      <input
        type="url"
        value={externalUrl}
        onChange={(e) => setExternalUrl(e.target.value)}
        placeholder="Event URL (optional)"
        className={inputCls}
      />

      {/* Product links */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-foreground flex items-center gap-1">
            <ShoppingBag className="h-3 w-3" />
            Linked Products
          </label>
          <button
            type="button"
            onClick={() => setShowProductPicker(!showProductPicker)}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            {showProductPicker ? 'Hide catalogue' : 'Browse catalogue'}
          </button>
        </div>

        {/* Product picker from Shopify catalogue */}
        {showProductPicker && products.length > 0 && (
          <div className="rounded-lg border border-border bg-card max-h-40 overflow-y-auto">
            {products.map((product) => {
              const shopifyUrl = `https://blakemill.co.uk/products/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
              const alreadyLinked = productUrls.some((u) => u.includes(product.shopify_id))
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    if (!alreadyLinked) addProductUrl(shopifyUrl)
                  }}
                  disabled={alreadyLinked}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted transition-colors border-b border-border last:border-0 ${
                    alreadyLinked ? 'opacity-40' : ''
                  }`}
                >
                  {product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt=""
                      className="h-8 w-8 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-muted-foreground">£{product.price}</p>
                  </div>
                  {alreadyLinked ? (
                    <span className="text-[10px] text-muted-foreground">Added</span>
                  ) : (
                    <Plus className="h-3 w-3 text-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Manual URL inputs */}
        {productUrls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                const next = [...productUrls]
                next[i] = e.target.value
                setProductUrls(next)
              }}
              placeholder="https://blakemill.co.uk/products/..."
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeProductUrl(i)}
              className="shrink-0 p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setProductUrls([...productUrls, ''])}
          className="text-[10px] font-medium text-primary hover:underline"
        >
          + Add product URL
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Campaign notes (e.g. 'Promote festival-ready shirts, target 18-30 in Manchester')"
        rows={2}
        className={inputCls}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim() || !eventDate || saving}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : initial ? 'Update Event' : 'Add Event'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
