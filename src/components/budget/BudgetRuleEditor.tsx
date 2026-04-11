// T060 — Budget Rule Editor
// Form for creating and editing budget rules.
// Props: rule (optional pre-fill), onSave, onCancel.

import { useState } from 'react'
import type { BudgetRule, BudgetScope, BudgetPeriod } from '@/lib/types'

interface Props {
  rule?: BudgetRule
  onSave: (rule: Partial<BudgetRule>) => void
  onCancel?: () => void
}

const SCOPE_OPTIONS: { value: BudgetScope; label: string }[] = [
  { value: 'global', label: 'Global (all spend)' },
  { value: 'channel', label: 'Per channel' },
  { value: 'campaign', label: 'Per campaign' },
]

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export function BudgetRuleEditor({ rule, onSave, onCancel }: Props) {
  const [scope, setScope] = useState<BudgetScope>(rule?.scope ?? 'global')
  const [period, setPeriod] = useState<BudgetPeriod>(rule?.period ?? 'monthly')
  const [limitAmount, setLimitAmount] = useState<string>(
    rule?.limit_amount !== undefined ? String(rule.limit_amount) : ''
  )
  const [alertThreshold, setAlertThreshold] = useState<number>(
    rule?.alert_threshold_pct ?? 80
  )
  const [autoPause, setAutoPause] = useState<boolean>(rule?.auto_pause ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const next: Record<string, string> = {}
    const amount = parseFloat(limitAmount)
    if (!limitAmount || isNaN(amount) || amount <= 0) {
      next.limitAmount = 'Enter a positive amount.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    onSave({
      ...(rule?.id ? { id: rule.id } : {}),
      scope,
      period,
      limit_amount: parseFloat(limitAmount),
      alert_threshold_pct: alertThreshold,
      auto_pause: autoPause,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Scope */}
      <div className="space-y-1.5">
        <label htmlFor="bre-scope" className="block text-sm font-medium text-foreground">
          Scope
        </label>
        <select
          id="bre-scope"
          value={scope}
          onChange={(e) => setScope(e.target.value as BudgetScope)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SCOPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Period */}
      <div className="space-y-1.5">
        <label htmlFor="bre-period" className="block text-sm font-medium text-foreground">
          Period
        </label>
        <select
          id="bre-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Limit amount */}
      <div className="space-y-1.5">
        <label htmlFor="bre-limit" className="block text-sm font-medium text-foreground">
          Spend limit (£)
        </label>
        <input
          id="bre-limit"
          type="number"
          min="0.01"
          step="0.01"
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
          placeholder="e.g. 500"
          aria-invalid={!!errors.limitAmount}
          aria-describedby={errors.limitAmount ? 'bre-limit-error' : undefined}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
        />
        {errors.limitAmount && (
          <p id="bre-limit-error" className="text-xs text-destructive" role="alert">
            {errors.limitAmount}
          </p>
        )}
      </div>

      {/* Alert threshold */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="bre-threshold" className="block text-sm font-medium text-foreground">
            Alert at
          </label>
          <span className="text-sm tabular-nums text-muted-foreground">{alertThreshold}%</span>
        </div>
        <input
          id="bre-threshold"
          type="range"
          min={0}
          max={100}
          step={5}
          value={alertThreshold}
          onChange={(e) => setAlertThreshold(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Auto pause */}
      <div className="flex items-center gap-3">
        <button
          id="bre-autopause"
          type="button"
          role="switch"
          aria-checked={autoPause}
          onClick={() => setAutoPause((v) => !v)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            autoPause ? 'bg-primary' : 'bg-input'
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition-transform ${
              autoPause ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <label htmlFor="bre-autopause" className="text-sm text-foreground cursor-pointer">
          Auto-pause campaigns when limit is reached
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {rule ? 'Update rule' : 'Save rule'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
