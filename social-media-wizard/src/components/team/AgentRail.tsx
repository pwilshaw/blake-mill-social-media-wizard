import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Settings, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { runTemplate, updateAgentSettings, updateTemplate } from '@/lib/agents/api'
import { AGENT_DISPLAY } from './TeamMessage'
import type { AgentKey, AgentSettings, AgentTemplate } from '@/lib/types'

interface Props {
  settings: AgentSettings[]
  templates: AgentTemplate[]
}

export function AgentRail({ settings, templates }: Props) {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-3">
      {(['social_media', 'cro', 'acquisition'] as AgentKey[]).map((key) => {
        const s = settings.find((x) => x.agent_key === key)
        const t = templates.filter((x) => x.agent_key === key)
        if (!s) return null
        return <AgentCard key={key} settings={s} templates={t} />
      })}
    </aside>
  )
}

function AgentCard({ settings, templates }: { settings: AgentSettings; templates: AgentTemplate[] }) {
  const meta = AGENT_DISPLAY[settings.agent_key]
  const [open, setOpen] = useState(true)
  const [editingSettings, setEditingSettings] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${meta.color}`}>
          {meta.initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{settings.display_name}</p>
          <p className="text-[11px] text-muted-foreground">{templates.length} templates</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Templates</span>
            <button
              type="button"
              onClick={() => setEditingSettings(true)}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              aria-label="Edit agent persona"
            >
              <Settings className="h-3 w-3" />
              Persona
            </button>
          </div>

          <ul className="max-h-72 overflow-y-auto">
            {templates.map((tpl) => <TemplateRow key={tpl.id} tpl={tpl} />)}
          </ul>
        </div>
      )}

      {editingSettings && (
        <SettingsDialog
          settings={settings}
          onClose={() => setEditingSettings(false)}
        />
      )}
    </div>
  )
}

function TemplateRow({ tpl }: { tpl: AgentTemplate }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const runMutation = useMutation({
    mutationFn: () => runTemplate(tpl.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team_messages'] }),
  })

  return (
    <li className="px-3 py-2 hover:bg-muted/20 border-b border-border last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{tpl.name}</p>
          {tpl.description && (
            <p className="text-[11px] text-muted-foreground truncate">{tpl.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {tpl.cron_expr ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 border border-emerald-200">
                <Clock className="h-2.5 w-2.5" />
                {prettyCron(tpl.cron_expr)}
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground">on-demand</span>
            )}
            {tpl.last_run_at && (
              <span className="text-[9px] text-muted-foreground">last run · {timeAgo(tpl.last_run_at)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            title="Run this template now"
          >
            <Play className="h-3 w-3" />
            {runMutation.isPending ? '…' : 'Run'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground"
            aria-label="Edit template"
          >
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
      {runMutation.error && (
        <p className="mt-1 text-[10px] text-destructive">
          {(runMutation.error as Error).message}
        </p>
      )}
      {editing && <TemplateEditDialog tpl={tpl} onClose={() => setEditing(false)} />}
    </li>
  )
}

function SettingsDialog({ settings, onClose }: { settings: AgentSettings; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [systemPrompt, setSystemPrompt] = useState(settings.system_prompt)
  const [customRules, setCustomRules] = useState(settings.custom_rules ?? '')
  const save = useMutation({
    mutationFn: () => updateAgentSettings(settings.agent_key, { system_prompt: systemPrompt, custom_rules: customRules || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_settings'] })
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-lg w-[90vw] max-w-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">Persona — {settings.display_name}</h3>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">System prompt</span>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={8}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Custom rules (optional)</span>
          <textarea
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            rows={3}
            placeholder="e.g. Always reference sustainability angle when relevant."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
        {save.error && <p className="text-xs text-destructive">{(save.error as Error).message}</p>}
      </div>
    </div>
  )
}

const CRON_PRESETS: { label: string; value: string | null }[] = [
  { label: 'Off (on-demand)', value: null },
  { label: 'Daily 08:00 UTC', value: '0 8 * * *' },
  { label: 'Weekly Mon 08:00 UTC', value: '0 8 * * 1' },
  { label: 'Weekly Fri 09:00 UTC', value: '0 9 * * 5' },
  { label: 'Monthly 1st 08:00 UTC', value: '0 8 1 * *' },
]

function TemplateEditDialog({ tpl, onClose }: { tpl: AgentTemplate; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(tpl.name)
  const [promptTemplate, setPromptTemplate] = useState(tpl.prompt_template)
  const [customRules, setCustomRules] = useState(tpl.custom_rules ?? '')
  const [cronExpr, setCronExpr] = useState<string | null>(tpl.cron_expr)
  const [isActive, setIsActive] = useState(tpl.is_active)

  const isPreset = cronExpr === null || CRON_PRESETS.some((p) => p.value === cronExpr)

  const save = useMutation({
    mutationFn: () => updateTemplate(tpl.id, {
      name,
      prompt_template: promptTemplate,
      custom_rules: customRules || null,
      cron_expr: cronExpr,
      is_active: isActive,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_templates'] })
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-lg w-[90vw] max-w-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-foreground">Edit template</h3>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Prompt template</span>
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Custom rules (optional)</span>
          <textarea
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Schedule</span>
          <select
            value={cronExpr ?? ''}
            onChange={(e) => setCronExpr(e.target.value === '' ? null : e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CRON_PRESETS.map((p) => (
              <option key={String(p.value)} value={p.value ?? ''}>{p.label}</option>
            ))}
            {!isPreset && cronExpr && <option value={cronExpr}>{cronExpr} (custom)</option>}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <span>Active</span>
        </label>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">Cancel</button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
        {save.error && <p className="text-xs text-destructive">{(save.error as Error).message}</p>}
      </div>
    </div>
  )
}

function prettyCron(expr: string): string {
  const preset = CRON_PRESETS.find((p) => p.value === expr)
  if (preset) return preset.label
  return expr
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
