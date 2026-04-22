// Search Intelligence Edge Function — SerpAPI integration
// Keyword research, content angles, trending, weather, and events — all via SerpAPI.
// Results cached in Supabase to minimise API calls.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getIntegrationKey } from '../_shared/integration-credentials.ts'

const DAILY_SEARCH_CAP = 15
const MONTHLY_SEARCH_CAP = 80

// Cache durations
const WEATHER_CACHE_HOURS = 6
const EVENTS_CACHE_HOURS = 24
const SEARCH_CACHE_HOURS = 12

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// -----------------------------------------------------------------------
// Supabase cache helpers
// -----------------------------------------------------------------------

async function getCached(db: ReturnType<typeof createClient>, key: string): Promise<unknown | null> {
  const { data } = await db
    .from('search_cache')
    .select('data, expires_at')
    .eq('cache_key', key)
    .single()

  if (!data) return null
  if (new Date(data.expires_at) < new Date()) {
    // Expired — delete and return null
    await db.from('search_cache').delete().eq('cache_key', key)
    return null
  }
  return data.data
}

async function setCache(db: ReturnType<typeof createClient>, key: string, value: unknown, hours: number) {
  const expires = new Date(Date.now() + hours * 3600000).toISOString()
  await db.from('search_cache').upsert(
    { cache_key: key, data: value, expires_at: expires, created_at: new Date().toISOString() },
    { onConflict: 'cache_key' }
  )
}

// -----------------------------------------------------------------------
// SerpAPI fetch
// -----------------------------------------------------------------------

interface SerpApiParams {
  engine: string
  q?: string
  location?: string
  gl?: string
  hl?: string
  num?: number
  api_key: string
  [key: string]: string | number | undefined
}

async function serpApiSearch(params: SerpApiParams): Promise<Record<string, unknown>> {
  const url = new URL('https://serpapi.com/search.json')
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`SerpAPI error (${res.status}): ${await res.text()}`)
  return res.json()
}

// -----------------------------------------------------------------------
// Weather — via Google answer_box
// -----------------------------------------------------------------------

async function fetchWeather(apiKey: string, city: string) {
  const data = await serpApiSearch({
    engine: 'google',
    q: `weather ${city} UK 7 day forecast`,
    gl: 'uk',
    hl: 'en',
    api_key: apiKey,
  })

  const ab = (data.answer_box ?? {}) as Record<string, unknown>

  return {
    location: ab.location ?? city,
    current: {
      temperature: Number(ab.temperature ?? 0),
      condition: ab.weather ?? 'Unknown',
      humidity: ab.humidity ?? '',
      wind: ab.wind ?? '',
      precipitation: ab.precipitation ?? '',
    },
    forecast: ((ab.forecast ?? []) as Array<Record<string, unknown>>).map((day) => {
      const temp = (day.temperature ?? {}) as Record<string, string>
      return {
        day: day.day ?? '',
        high: Number(temp.high ?? 0),
        low: Number(temp.low ?? 0),
        condition: day.weather ?? '',
      }
    }),
  }
}

// -----------------------------------------------------------------------
// Events — via google_events engine
// -----------------------------------------------------------------------

async function fetchEvents(apiKey: string, city: string) {
  const data = await serpApiSearch({
    engine: 'google_events',
    q: `events in ${city} this month`,
    gl: 'uk',
    hl: 'en',
    api_key: apiKey,
  })

  return {
    location: city,
    events: ((data.events_results ?? []) as Array<Record<string, unknown>>).map((e) => {
      const dateInfo = (e.date ?? {}) as Record<string, string>
      const venue = (e.venue ?? {}) as Record<string, string>
      const addressParts = (e.address ?? []) as string[]
      return {
        title: e.title ?? '',
        date: dateInfo.start_date ?? '',
        when: dateInfo.when ?? '',
        venue: venue.name ?? addressParts[0] ?? '',
        address: addressParts.join(', '),
        description: e.description ?? '',
        link: e.link ?? '',
        thumbnail: e.thumbnail ?? '',
        category: detectEventCategory(String(e.title ?? '')),
      }
    }),
  }
}

function detectEventCategory(title: string): string {
  const t = title.toLowerCase()
  if (/concert|gig|live music|dj|band|festival|acoustic/.test(t)) return 'music'
  if (/football|cricket|rugby|tennis|boxing|racing|marathon|run/.test(t)) return 'sports'
  if (/fashion|runway|design|style/.test(t)) return 'fashion'
  if (/food|drink|beer|wine|market|brunch/.test(t)) return 'food'
  if (/comedy|standup|stand-up|laugh/.test(t)) return 'comedy'
  if (/theatre|theater|musical|play|opera|ballet/.test(t)) return 'theatre'
  if (/art|exhibition|gallery|museum/.test(t)) return 'arts'
  return 'local'
}

// -----------------------------------------------------------------------
// Keyword Research
// -----------------------------------------------------------------------

async function keywordResearch(apiKey: string, query: string, location: string) {
  const data = await serpApiSearch({
    engine: 'google',
    q: query,
    location,
    gl: 'uk',
    hl: 'en',
    num: 10,
    api_key: apiKey,
  })

  return {
    query,
    location,
    total_results: (data.search_information as Record<string, unknown>)?.total_results,
    organic_results: ((data.organic_results ?? []) as Array<Record<string, unknown>>).map((r) => ({
      position: r.position, title: r.title, link: r.link, snippet: r.snippet, displayed_link: r.displayed_link,
    })),
    people_also_ask: ((data.related_questions ?? []) as Array<Record<string, unknown>>).map((q) => ({
      question: q.question, snippet: q.snippet, link: q.link,
    })),
    related_searches: ((data.related_searches ?? []) as Array<Record<string, unknown>>).map((s) => ({
      query: s.query, link: s.link,
    })),
    shopping_results: ((data.shopping_results ?? []) as Array<Record<string, unknown>>).map((s) => ({
      title: s.title, price: s.price, source: s.source, link: s.link, thumbnail: s.thumbnail,
    })),
  }
}

// -----------------------------------------------------------------------
// Trending
// -----------------------------------------------------------------------

async function trendingSearch(apiKey: string, query: string) {
  const data = await serpApiSearch({
    engine: 'google_trends',
    q: query,
    geo: 'GB',
    data_type: 'TIMESERIES',
    api_key: apiKey,
  })

  const relatedData = await serpApiSearch({
    engine: 'google_trends',
    q: query,
    geo: 'GB',
    data_type: 'RELATED_QUERIES',
    api_key: apiKey,
  })

  const rq = (relatedData.related_queries ?? {}) as Record<string, unknown>

  return {
    query,
    interest_over_time: (
      ((data.interest_over_time ?? {}) as Record<string, unknown>).timeline_data as Array<Record<string, unknown>> ?? []
    ).slice(-30).map((p) => ({ date: p.date, values: p.values })),
    rising_queries: ((rq.rising ?? []) as Array<Record<string, unknown>>).slice(0, 10).map((q) => ({
      query: q.query, value: q.value, extracted_value: q.extracted_value,
    })),
    top_queries: ((rq.top ?? []) as Array<Record<string, unknown>>).slice(0, 10).map((q) => ({
      query: q.query, value: q.value, extracted_value: q.extracted_value,
    })),
  }
}

// -----------------------------------------------------------------------
// Content Angles
// -----------------------------------------------------------------------

async function contentAngles(apiKey: string, query: string, location: string) {
  const searchData = await serpApiSearch({
    engine: 'google', q: query, location, gl: 'uk', hl: 'en', num: 5, api_key: apiKey,
  })

  const paa = ((searchData.related_questions ?? []) as Array<Record<string, unknown>>).map((q) => ({
    question: q.question, snippet: q.snippet,
  }))

  const autocompleteData = await serpApiSearch({
    engine: 'google_autocomplete', q: query, gl: 'uk', hl: 'en', api_key: apiKey,
  })

  const suggestions = ((autocompleteData.suggestions ?? []) as Array<Record<string, unknown>>).map((s) => ({
    value: s.value,
  }))

  const angles = [
    ...paa.map((p) => ({
      type: 'question' as const, angle: String(p.question), context: String(p.snippet ?? ''), source: 'People Also Ask',
    })),
    ...suggestions.map((s) => ({
      type: 'search_term' as const, angle: String(s.value), context: 'Real search suggestion — use as hashtag or content hook', source: 'Google Autocomplete',
    })),
  ]

  return { query, angles, total: angles.length }
}

// -----------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceRoleKey)

  const apiKey = await getIntegrationKey(db, {
    provider: 'serpapi',
    envVars: ['SERPAPI_KEY'],
  })
  if (!apiKey) {
    return jsonResponse({ error: 'SerpAPI key not configured. Add one in Integrations.' }, 500)
  }

  let body: { action?: string; query?: string; location?: string; city?: string }
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON body.' }, 400) }

  const { action, query, location = 'United Kingdom', city } = body

  if (!action) return jsonResponse({ error: 'action is required.' }, 400)

  // Weather and events use city param; others use query
  const searchTerm = query || city || ''
  if (!searchTerm && action !== 'weather' && action !== 'events') {
    return jsonResponse({ error: 'query or city is required.' }, 400)
  }

  // --- Check cache first for weather/events ---
  if (action === 'weather' || action === 'events') {
    const cacheKey = `${action}:${(city || 'london').toLowerCase()}`
    const cached = await getCached(db, cacheKey)
    if (cached) {
      return jsonResponse({ ...(cached as Record<string, unknown>), _cached: true })
    }
  }

  // --- Rate limiting (skip for cached responses) ---
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const { count: todayCount } = await db
    .from('search_usage')
    .select('*', { count: 'exact', head: true })
    .gte('searched_at', `${today}T00:00:00Z`)

  if ((todayCount ?? 0) >= DAILY_SEARCH_CAP) {
    return jsonResponse({
      error: `Daily search limit reached (${DAILY_SEARCH_CAP}/day). Resets at midnight UTC.`,
      limit: DAILY_SEARCH_CAP, used_today: todayCount,
    }, 429)
  }

  const { count: monthCount } = await db
    .from('search_usage')
    .select('*', { count: 'exact', head: true })
    .gte('searched_at', `${monthStart}T00:00:00Z`)

  if ((monthCount ?? 0) >= MONTHLY_SEARCH_CAP) {
    return jsonResponse({
      error: `Monthly search limit reached (${MONTHLY_SEARCH_CAP}/month).`,
      limit: MONTHLY_SEARCH_CAP, used_month: monthCount,
    }, 429)
  }

  const apiCallCounts: Record<string, number> = {
    keyword_research: 1, competitor: 1, trending: 2, content_angles: 2, weather: 1, events: 1,
  }

  try {
    let result: unknown
    let cacheKey: string | null = null
    let cacheHours = SEARCH_CACHE_HOURS

    switch (action) {
      case 'weather': {
        const c = city || 'London'
        result = await fetchWeather(apiKey, c)
        cacheKey = `weather:${c.toLowerCase()}`
        cacheHours = WEATHER_CACHE_HOURS
        break
      }
      case 'events': {
        const c = city || 'London'
        result = await fetchEvents(apiKey, c)
        cacheKey = `events:${c.toLowerCase()}`
        cacheHours = EVENTS_CACHE_HOURS
        break
      }
      case 'keyword_research':
      case 'competitor':
        result = await keywordResearch(apiKey, searchTerm, location)
        break
      case 'trending':
        result = await trendingSearch(apiKey, searchTerm)
        break
      case 'content_angles':
        result = await contentAngles(apiKey, searchTerm, location)
        break
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }

    // Cache weather/events
    if (cacheKey) {
      await setCache(db, cacheKey, result, cacheHours)
    }

    // Log usage
    await db.from('search_usage').insert({
      query: searchTerm || city || action,
      action,
      api_calls: apiCallCounts[action] ?? 1,
    })

    const updatedToday = (todayCount ?? 0) + 1
    const updatedMonth = (monthCount ?? 0) + 1

    return jsonResponse({
      ...(result as Record<string, unknown>),
      _usage: {
        today: updatedToday, daily_limit: DAILY_SEARCH_CAP,
        month: updatedMonth, monthly_limit: MONTHLY_SEARCH_CAP,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
