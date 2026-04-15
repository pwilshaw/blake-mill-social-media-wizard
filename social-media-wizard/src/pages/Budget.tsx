// T068 — Budget page
// Budget rules list with inline BudgetRuleEditor.
// SpendTracker visualisation.
// Spend log table.

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BudgetRuleEditor } from '@/components/budget/BudgetRuleEditor'
import { SpendTracker } from '@/components/budget/SpendTracker'
import { PLATFORM_META } from '@/lib/platforms'
import {
  BUDGET_ALLOCATION_PRESETS,
  BUDGET_EVENT_MULTIPLIERS,
} from '@/lib/playbook-presets'
import type { BudgetRule, SpendLog, Platform } from '@/lib/types'
import { PieChart, Zap, ChevronDown, ChevronUp } from 'lucide-react'

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

async function fetchBudgetRules(): Promise<BudgetRule[]> {
  const { data, error } = await supabase
    .from('budget_rules')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as BudgetRule[]
}

async function fetchSpendLogs(): Promise<SpendLog[]> {
  const { data, error } = await supabase
    .from('spend_logs')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as SpendLog[]
}

async function saveRule(rule: Partial<BudgetRule>): Promise<void> {
  if (rule.id) {
    const { error } = await supabase
      .from('budget_rules')
      .update(rule)
      .eq('id', rule.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('budget_rules').insert(rule)
    if (error) throw new Error(error.message)
  }
}

async function deleteRule(id: string): Promise<void> {
  const { error } = await supabase.from('budget_rules').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Rule list row
// ---------------------------------------------------------------------------

function RuleRow({
  rule,
  onEdit,
  onDelete,
}: {
  rule: BudgetRule
  onEdit: (rule: BudgetRule) => void
  onDelete: (id: string) => void
}) {
  const pct = Math.min((rule.current_spend / rule.limit_amount) * 100, 100)
  const isAlert = pct >= rule.alert_threshold_pct

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground capitalize">{rule.scope}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
            {rule.period}
          </span>
          {isAlert && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400">
              Alert
            </span>
          )}
          {rule.auto_pause && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
              Auto-pause
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatGbp(rule.current_spend)} / {formatGbp(rule.limit_amount)} · alert at {rule.alert_threshold_pct}%
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onEdit(rule)}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(rule.id)}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Budget() {
  const queryClient = useQueryClient()
  const [showEditor, setShowEditor] = useState(false)
  const [editingRule, setEditingRule] = useState<BudgetRule | undefined>(undefined)

  const {
    data: rules = [],
    isLoading: rulesLoading,
    error: rulesError,
  } = useQuery({ queryKey: ['budget-rules'], queryFn: fetchBudgetRules })

  const {
    data: spendLogs = [],
    isLoading: logsLoading,
  } = useQuery({ queryKey: ['spend-logs'], queryFn: fetchSpendLogs })

  const { mutate: doSave, isPending: isSaving } = useMutation({
    mutationFn: saveRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-rules'] })
      setShowEditor(false)
      setEditingRule(undefined)
    },
  })

  const { mutate: doDelete } = useMutation({
    mutationFn: deleteRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget-rules'] }),
  })

  function handleEdit(rule: BudgetRule) {
    setEditingRule(rule)
    setShowEditor(true)
  }

  function handleAddNew() {
    setEditingRule(undefined)
    setShowEditor(true)
  }

  function handleCancel() {
    setShowEditor(false)
    setEditingRule(undefined)
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Budget</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ad spend rules and tracking.</p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Add rule
        </button>
      </div>

      {/* Playbook Budget Presets */}
      <BudgetPlaybookPresets />

      {/* Rule editor panel */}
      {showEditor && (
        <section
          aria-label={editingRule ? 'Edit budget rule' : 'New budget rule'}
          className="rounded-lg border border-border bg-card p-6"
        >
          <h2 className="mb-5 text-base font-semibold text-foreground">
            {editingRule ? 'Edit rule' : 'New rule'}
          </h2>
          <BudgetRuleEditor
            rule={editingRule}
            onSave={(r) => doSave(r)}
            onCancel={handleCancel}
          />
          {isSaving && (
            <p className="mt-2 text-xs text-muted-foreground">Saving…</p>
          )}
        </section>
      )}

      {/* Rules list */}
      <section aria-label="Budget rules" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Rules</h2>

        {rulesLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {rulesError && (
          <p className="text-sm text-destructive">
            Failed to load rules: {rulesError instanceof Error ? rulesError.message : 'Unknown error'}
          </p>
        )}

        {!rulesLoading && rules.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-10 text-center">
            <p className="text-sm text-muted-foreground">No budget rules configured.</p>
            <button
              type="button"
              onClick={handleAddNew}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Add your first rule
            </button>
          </div>
        )}

        {rules.map((rule) => (
          <RuleRow
            key={rule.id}
            rule={rule}
            onEdit={handleEdit}
            onDelete={(id) => doDelete(id)}
          />
        ))}
      </section>

      {/* Spend visualisation */}
      <section aria-label="Spend tracking" className="rounded-lg border border-border bg-card p-6">
        <SpendTracker rules={rules} spendLogs={spendLogs} />
      </section>

      {/* Spend log table */}
      <section aria-label="Spend log" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Spend log</h2>

        {logsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!logsLoading && spendLogs.length === 0 && (
          <p className="text-sm text-muted-foreground">No spend recorded yet.</p>
        )}

        {spendLogs.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Campaign
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Channel
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {spendLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(log.logged_at)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {log.campaign_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {log.channel_account_id.slice(0, 8)}…
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-foreground tabular-nums">
                      {formatGbp(log.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.description ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

// ----------------------------------------------------------------
// Budget Playbook Presets Component
// ----------------------------------------------------------------

function BudgetPlaybookPresets() {
  const [expanded, setExpanded] = useState(false)
  const [selectedAllocation, setSelectedAllocation] = useState<string>('ba-growth')

  const activePreset = BUDGET_ALLOCATION_PRESETS.find((p) => p.id === selectedAllocation)

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2">
            <PieChart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Playbook Budget Strategy</p>
            <p className="text-xs text-muted-foreground">
              Allocation frameworks and event budget multipliers
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-6">
          {/* Allocation framework selector */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Budget Allocation Framework
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {BUDGET_ALLOCATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedAllocation(preset.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selectedAllocation === preset.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                </button>
              ))}
            </div>

            {/* Show selected allocation breakdown */}
            {activePreset && (
              <div className="mt-4 space-y-2">
                {activePreset.allocations.map((alloc) => {
                  const meta = PLATFORM_META[alloc.platform as Platform]
                  return (
                    <div key={alloc.platform} className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium w-20 text-center ${meta?.color ?? ''} ${meta?.bgColor ?? 'bg-muted'}`}>
                        {meta?.label ?? alloc.platform}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${alloc.pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums w-10 text-right">{alloc.pct}%</span>
                      <span className="text-xs text-muted-foreground hidden sm:block">{alloc.focus}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Event multipliers */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5" />
              Event Budget Multipliers
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BUDGET_EVENT_MULTIPLIERS.map((mult) => (
                <div
                  key={mult.id}
                  className="rounded-lg border border-border p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{mult.name}</p>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 tabular-nums">
                      {mult.multiplier}x
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{mult.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
