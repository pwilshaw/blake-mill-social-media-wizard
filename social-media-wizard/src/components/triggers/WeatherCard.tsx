// Live weather forecast card — data from SerpAPI via search-intelligence edge function
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, RefreshCw, Loader2 } from 'lucide-react'
import type { ContextualTrigger } from '@/lib/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface WeatherData {
  location: string
  current: {
    temperature: number
    condition: string
    humidity: string
    wind: string
    precipitation: string
  }
  forecast: {
    day: string
    high: number
    low: number
    condition: string
  }[]
  _cached?: boolean
}

interface WeatherCardProps {
  triggers: ContextualTrigger[]
}

const CONDITION_ICONS: Record<string, string> = {
  sunny: '☀️',
  clear: '☀️',
  'partly sunny': '🌤️',
  'partly cloudy': '⛅',
  'mostly sunny': '🌤️',
  'mostly cloudy': '🌥️',
  cloudy: '☁️',
  overcast: '☁️',
  rain: '🌧️',
  'light rain': '🌦️',
  showers: '🌦️',
  'scattered showers': '🌦️',
  thunderstorm: '⛈️',
  snow: '🌨️',
  'light snow': '🌨️',
  fog: '🌫️',
  haze: '🌫️',
  windy: '💨',
}

function getIcon(condition: string): string {
  const lower = condition.toLowerCase()
  for (const [key, icon] of Object.entries(CONDITION_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '🌡️'
}

const UK_CITIES = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Edinburgh', 'Glasgow', 'Cardiff', 'Newcastle']

async function fetchWeather(city: string): Promise<WeatherData> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ action: 'weather', city }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Weather fetch failed')
  }
  return res.json()
}

function matchesTrigger(high: number, condition: string, triggers: ContextualTrigger[]): ContextualTrigger | null {
  for (const trigger of triggers) {
    if (!trigger.is_active || trigger.trigger_type !== 'weather') continue
    const cond = trigger.conditions as { temp_min?: number; temp_max?: number; condition?: string; min_temp?: number; max_temp?: number }
    const minTemp = cond.temp_min ?? cond.min_temp
    const maxTemp = cond.temp_max ?? cond.max_temp
    const tempOk = (minTemp === undefined || high >= minTemp) && (maxTemp === undefined || high <= maxTemp)
    const condOk = !cond.condition || condition.toLowerCase().includes(cond.condition.toLowerCase())
    if (tempOk && condOk) return trigger
  }
  return null
}

export function WeatherCard({ triggers }: WeatherCardProps) {
  const [city, setCity] = useState('London')

  const { data: weather, isLoading, error, refetch } = useQuery<WeatherData>({
    queryKey: ['weather', city],
    queryFn: () => fetchWeather(city),
    staleTime: 1000 * 60 * 30, // 30 min client-side cache
    retry: 1,
  })

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Live Weather</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {weather?._cached ? 'Cached' : 'Live'} · trigger matches highlighted
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {UK_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-destructive">{error.message}</p>
          <button onClick={() => refetch()} className="mt-2 text-xs text-primary hover:underline">
            Try again
          </button>
        </div>
      )}

      {/* Weather data */}
      {weather && !isLoading && (
        <>
          {/* Current conditions */}
          <div className="px-4 py-3 flex items-center gap-4 border-b border-border bg-muted/20">
            <span className="text-4xl">{getIcon(weather.current.condition)}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{weather.current.temperature}°C</span>
                <span className="text-sm text-muted-foreground">{weather.current.condition}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {weather.location}
                </span>
                {weather.current.wind && <span>Wind: {weather.current.wind}</span>}
                {weather.current.humidity && <span>Humidity: {weather.current.humidity}</span>}
                {weather.current.precipitation && <span>Rain: {weather.current.precipitation}</span>}
              </div>
            </div>
          </div>

          {/* Forecast grid */}
          <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-border">
            {weather.forecast.slice(0, 8).map((day, i) => {
              const matched = matchesTrigger(day.high, day.condition, triggers)
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-1 px-2 py-3 transition-colors ${
                    matched ? 'bg-primary/10' : ''
                  }`}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">{day.day}</span>
                  <span className="text-xl">{getIcon(day.condition)}</span>
                  <div className="text-center">
                    <span className="text-xs font-bold text-foreground">{day.high}°</span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">{day.low}°</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground text-center leading-tight capitalize">
                    {day.condition}
                  </span>
                  {matched && (
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" title={matched.name} />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
