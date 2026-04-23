import { Loader2 } from 'lucide-react'

interface Props {
  completed: number
  total: number
  inFlight: number
  failed: number
  onCancel: () => void
}

export function RunnerStage({ completed, total, inFlight, failed, onCancel }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="mx-auto max-w-xl space-y-6 py-10">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Running study…</h2>
          <p className="text-xs text-muted-foreground">
            Claude is simulating {total} buying decisions. This usually takes 20–60 seconds.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completed} of {total} complete</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{inFlight} in flight</span>
          {failed > 0 && <span className="text-destructive">{failed} failed</span>}
        </div>
      </div>

      <div className="flex justify-end pt-3 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-muted-foreground hover:text-destructive"
        >
          Cancel study
        </button>
      </div>
    </div>
  )
}
