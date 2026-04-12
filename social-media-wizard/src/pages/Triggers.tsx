// T051 — Triggers page: manage contextual triggers, view weather & events, manage templates
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { TriggerRuleBuilder } from '@/components/triggers/TriggerRuleBuilder'
import { WeatherCard } from '@/components/triggers/WeatherCard'
import { EventFeed } from '@/components/triggers/EventFeed'
import { TemplateEditor } from '@/components/triggers/TemplateEditor'
import { formatDate } from '@/lib/format'
import type { ContextualTrigger, ContentTemplate } from '@/lib/types'

// ----------------------------------------------------------------
// Supabase helpers
// ----------------------------------------------------------------

async function fetchTriggers(): Promise<ContextualTrigger[]> {
  const { data, error } = await supabase
    .from('contextual_triggers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ContextualTrigger[]
}

async function fetchTemplates(): Promise<ContentTemplate[]> {
  const { data, error } = await supabase
    .from('content_templates')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as ContentTemplate[]
}

type CreateTriggerInput = Omit<ContextualTrigger, 'id' | 'last_fired_at'>
type CreateTemplateInput = Omit<ContentTemplate, 'id' | 'is_active' | 'created_at'>

// ----------------------------------------------------------------
// Type badge helpers
// ----------------------------------------------------------------

const TRIGGER_TYPE_COLOURS: Record<string, string> = {
  weather: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  event: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  holiday: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  seasonal: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
}

function TriggerTypeBadge({ type }: { type: string }) {
  const cls = TRIGGER_TYPE_COLOURS[type] ?? 'bg-muted text-muted-foreground'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${cls}`}
    >
      {type}
    </span>
  )
}

// ----------------------------------------------------------------
// Placeholder forecast / event data (replaced by real API in production)
// ----------------------------------------------------------------

const PLACEHOLDER_FORECAST = [
  { date: new Date(Date.now() + 0 * 86400000).toISOString().split('T')[0], temp: 22, condition: 'sunny', icon: '☀️' },
  { date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0], temp: 19, condition: 'cloudy', icon: '☁️' },
  { date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0], temp: 14, condition: 'rainy', icon: '🌧️' },
  { date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], temp: 11, condition: 'stormy', icon: '⛈️' },
  { date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0], temp: 17, condition: 'overcast', icon: '🌥️' },
  { date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], temp: 21, condition: 'sunny', icon: '☀️' },
  { date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0], temp: 23, condition: 'sunny', icon: '🌤️' },
]

const PLACEHOLDER_EVENTS = [
  { id: '1', title: 'Glastonbury Festival', category: 'music', date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], relevance: 92 },
  { id: '2', title: 'London Marathon', category: 'sports', date: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0], relevance: 78 },
  { id: '3', title: 'Notting Hill Carnival', category: 'festival', date: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0], relevance: 85 },
  { id: '4', title: 'Chelsea Flower Show', category: 'outdoor', date: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0], relevance: 54 },
  { id: '5', title: 'Wimbledon Championships', category: 'sports', date: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0], relevance: 88 },
]

// ----------------------------------------------------------------
// Main page component
// ----------------------------------------------------------------

type ActiveView = 'list' | 'new-trigger' | 'edit-trigger' | 'new-template' | 'edit-template'

export default function Triggers() {
  const queryClient = useQueryClient()

  const [view, setView] = useState<ActiveView>('list')
  const [editingTrigger, setEditingTrigger] = useState<ContextualTrigger | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | null>(null)

  // ---- Queries ----

  const {
    data: triggers = [],
    isLoading: triggersLoading,
    error: triggersError,
  } = useQuery<ContextualTrigger[], Error>({
    queryKey: ['contextual-triggers'],
    queryFn: fetchTriggers,
    staleTime: 1000 * 60 * 2,
  })

  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
  } = useQuery<ContentTemplate[], Error>({
    queryKey: ['content-templates'],
    queryFn: fetchTemplates,
    staleTime: 1000 * 60 * 2,
  })

  // ---- Mutations ----

  const createTrigger = useMutation<ContextualTrigger, Error, CreateTriggerInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('contextual_triggers')
        .insert({ ...input, last_fired_at: null })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as ContextualTrigger
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contextual-triggers'] })
      setView('list')
    },
  })

  const updateTrigger = useMutation<ContextualTrigger, Error, Partial<ContextualTrigger> & { id: string }>({
    mutationFn: async ({ id, ...fields }) => {
      const { data, error } = await supabase
        .from('contextual_triggers')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as ContextualTrigger
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contextual-triggers'] })
      setView('list')
      setEditingTrigger(null)
    },
  })

  const deleteTrigger = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('contextual_triggers')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contextual-triggers'] })
    },
  })

  const createTemplate = useMutation<ContentTemplate, Error, CreateTemplateInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from('content_templates')
        .insert({ ...input, is_active: true })
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as ContentTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-templates'] })
      setView('list')
    },
  })

  const updateTemplate = useMutation<ContentTemplate, Error, Partial<ContentTemplate> & { id: string }>({
    mutationFn: async ({ id, ...fields }) => {
      const { data, error } = await supabase
        .from('content_templates')
        .update(fields)
        .eq('id', id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return data as ContentTemplate
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-templates'] })
      setView('list')
      setEditingTemplate(null)
    },
  })

  const deleteTemplate = useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('content_templates')
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-templates'] })
    },
  })

  // ---- Handlers ----

  function handleTriggerSave(data: CreateTriggerInput) {
    if (editingTrigger) {
      updateTrigger.mutate({ id: editingTrigger.id, ...data })
    } else {
      createTrigger.mutate(data)
    }
  }

  function handleTemplateSave(data: CreateTemplateInput) {
    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, ...data })
    } else {
      createTemplate.mutate(data)
    }
  }

  function openEditTrigger(trigger: ContextualTrigger) {
    setEditingTrigger(trigger)
    setView('edit-trigger')
  }

  function openEditTemplate(template: ContentTemplate) {
    setEditingTemplate(template)
    setView('edit-template')
  }

  function handleCancel() {
    setView('list')
    setEditingTrigger(null)
    setEditingTemplate(null)
  }

  // ---- Active triggers for panels ----
  const activeTriggers = triggers.filter((t) => t.is_active)

  // ----------------------------------------------------------------
  // Render: sub-views
  // ----------------------------------------------------------------

  if (view === 'new-trigger' || view === 'edit-trigger') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to triggers
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {view === 'edit-trigger' ? 'Edit trigger' : 'New trigger'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define conditions that automatically fire a new campaign.
          </p>
        </div>
        <div className="max-w-2xl">
          <TriggerRuleBuilder
            initial={editingTrigger ?? undefined}
            onSave={handleTriggerSave}
            onCancel={handleCancel}
          />
        </div>
      </div>
    )
  }

  if (view === 'new-template' || view === 'edit-template') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to triggers
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {view === 'edit-template' ? 'Edit template' : 'New content template'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create reusable copy templates for triggered campaigns.
          </p>
        </div>
        <TemplateEditor
          initial={editingTemplate ?? undefined}
          onSave={handleTemplateSave}
          onCancel={handleCancel}
        />
      </div>
    )
  }

  // ----------------------------------------------------------------
  // Render: main list view
  // ----------------------------------------------------------------

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Smart Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Contextual triggers that fire campaigns based on weather, events, and holidays.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setView('new-trigger')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          New trigger
        </button>
      </div>

      {/* Weather + Events panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WeatherCard forecast={PLACEHOLDER_FORECAST} triggers={activeTriggers} />
        <EventFeed events={PLACEHOLDER_EVENTS} triggers={activeTriggers} />
      </div>

      {/* Active triggers list */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">
          Trigger rules
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({activeTriggers.length} active)
          </span>
        </h2>

        {triggersLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading triggers…</div>
        )}

        {triggersError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load triggers: {triggersError.message}
          </div>
        )}

        {!triggersLoading && !triggersError && triggers.length === 0 && (
          <div className="py-12 text-center space-y-3 rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No triggers yet.</p>
            <button
              type="button"
              onClick={() => setView('new-trigger')}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create your first trigger
            </button>
          </div>
        )}

        {!triggersLoading && !triggersError && triggers.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">
                    Cooldown
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground">
                    Last fired
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">&nbsp;</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {triggers.map((trigger) => (
                  <tr key={trigger.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-medium text-foreground">{trigger.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {trigger.matched_shirts.length} shirt
                        {trigger.matched_shirts.length !== 1 ? 's' : ''} mapped
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <TriggerTypeBadge type={trigger.trigger_type} />
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4 text-muted-foreground">
                      {trigger.cooldown_hours}h
                    </td>
                    <td className="hidden md:table-cell px-4 py-4 text-muted-foreground">
                      {trigger.last_fired_at ? formatDate(trigger.last_fired_at) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          trigger.is_active
                            ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {trigger.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => openEditTrigger(trigger)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deactivate "${trigger.name}"?`)) {
                              deleteTrigger.mutate(trigger.id)
                            }
                          }}
                          className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Content templates section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            Content templates
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({templates.filter((t) => t.is_active).length} active)
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setView('new-template')}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            New template
          </button>
        </div>

        {templatesLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading templates…</div>
        )}

        {templatesError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load templates: {templatesError.message}
          </div>
        )}

        {!templatesLoading && !templatesError && templates.length === 0 && (
          <div className="py-10 text-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No content templates yet.</p>
            <button
              type="button"
              onClick={() => setView('new-template')}
              className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create first template
            </button>
          </div>
        )}

        {!templatesLoading && !templatesError && templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border border-border bg-card p-4 space-y-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {template.name}
                  </p>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary capitalize">
                    {template.platform}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {template.copy_template}
                </p>

                {template.style_preset && (
                  <p className="text-[11px] text-muted-foreground capitalize">
                    Style: {template.style_preset}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      template.is_active
                        ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => openEditTemplate(template)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deactivate template "${template.name}"?`)) {
                          deleteTemplate.mutate(template.id)
                        }
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
