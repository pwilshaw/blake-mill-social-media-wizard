// T046 — 7-day weather forecast card with trigger match highlighting
import type { ContextualTrigger } from '@/lib/types'

interface ForecastDay {
  date: string
  temp: number
  condition: string
  icon: string
}

interface WeatherCardProps {
  forecast: ForecastDay[]
  triggers: ContextualTrigger[]
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function matchesTrigger(day: ForecastDay, triggers: ContextualTrigger[]): ContextualTrigger | null {
  for (const trigger of triggers) {
    if (!trigger.is_active || trigger.trigger_type !== 'weather') continue

    const conditions = trigger.conditions as {
      temp_min?: number
      temp_max?: number
      condition?: string
    }

    const tempOk =
      (conditions.temp_min === undefined || day.temp >= conditions.temp_min) &&
      (conditions.temp_max === undefined || day.temp <= conditions.temp_max)

    const conditionOk =
      !conditions.condition ||
      day.condition.toLowerCase().includes(conditions.condition.toLowerCase())

    if (tempOk && conditionOk) return trigger
  }
  return null
}

export function WeatherCard({ forecast, triggers }: WeatherCardProps) {
  if (forecast.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No forecast data available.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">7-day forecast</h2>
        <p className="text-xs text-muted-foreground mt-0.5">UK weather — trigger matches highlighted</p>
      </div>

      <div className="grid grid-cols-7 divide-x divide-border">
        {forecast.slice(0, 7).map((day) => {
          const matched = matchesTrigger(day, triggers)

          return (
            <div
              key={day.date}
              className={`flex flex-col items-center gap-1.5 px-2 py-4 transition-colors ${
                matched ? 'bg-primary/10' : 'bg-transparent'
              }`}
            >
              {/* Day label */}
              <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">
                {formatDayLabel(day.date)}
              </span>

              {/* Weather icon */}
              <span className="text-2xl leading-none" role="img" aria-label={day.condition}>
                {day.icon}
              </span>

              {/* Temperature */}
              <span className="text-sm font-semibold text-foreground">{day.temp}°</span>

              {/* Condition */}
              <span className="text-[10px] text-muted-foreground text-center capitalize leading-tight">
                {day.condition}
              </span>

              {/* Trigger match indicator */}
              {matched && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                  <span className="text-[9px] text-primary font-medium text-center leading-tight max-w-[56px]">
                    {matched.name}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border bg-muted/30">
        <p className="text-[11px] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1.5 align-middle" />
          Days highlighted in blue match at least one active weather trigger.
        </p>
      </div>
    </div>
  )
}
