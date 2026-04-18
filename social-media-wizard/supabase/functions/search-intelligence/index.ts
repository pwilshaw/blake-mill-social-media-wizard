// Search Intelligence Edge Function — SerpAPI integration
// Provides keyword research, trending topics, organic analysis, and content angles.
//
// POST /functions/v1/search-intelligence
// Body: { action, query, location? }
//
// Actions:
//   "keyword_research" — organic results + PAA + related searches for a keyword
//   "trending"         — Google Trends for product/niche terms
//   "competitor"       — what's ranking for your product keywords
//   "content_angles"   — PAA data formatted as content angle suggestions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Daily search cap — SerpAPI free tier = 100/month
// Note: "content_angles" uses 2 API calls (search + autocomplete), "trending" uses 2 (timeseries + related)
const DAILY_SEARCH_CAP = 5
const MONTHLY_SEARCH_CAP = 80 // leave 20 buffer for the 100/month free tier

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
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SerpAPI error (${res.status}): ${err}`)
  }
  return res.json()
}

// -----------------------------------------------------------------------
// Keyword Research — organic results + PAA + related searches
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

  const organicResults = ((data.organic_results ?? []) as Array<Record<string, unknown>>).map(
    (r: Record<string, unknown>) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      displayed_link: r.displayed_link,
    })
  )

  const peopleAlsoAsk = ((data.related_questions ?? []) as Array<Record<string, unknown>>).map(
    (q: Record<string, unknown>) => ({
      question: q.question,
      snippet: q.snippet,
      link: q.link,
    })
  )

  const relatedSearches = ((data.related_searches ?? []) as Array<Record<string, unknown>>).map(
    (s: Record<string, unknown>) => ({
      query: s.query,
      link: s.link,
    })
  )

  // Extract shopping results if present
  const shoppingResults = ((data.shopping_results ?? []) as Array<Record<string, unknown>>).map(
    (s: Record<string, unknown>) => ({
      title: s.title,
      price: s.price,
      source: s.source,
      link: s.link,
      thumbnail: s.thumbnail,
    })
  )

  // Search info
  const searchInfo = data.search_information as Record<string, unknown> | undefined

  return {
    query,
    location,
    total_results: searchInfo?.total_results,
    time_taken: searchInfo?.time_taken_displayed,
    organic_results: organicResults,
    people_also_ask: peopleAlsoAsk,
    related_searches: relatedSearches,
    shopping_results: shoppingResults,
  }
}

// -----------------------------------------------------------------------
// Google Trends — what's trending for product terms
// -----------------------------------------------------------------------

async function trendingSearch(apiKey: string, query: string) {
  const data = await serpApiSearch({
    engine: 'google_trends',
    q: query,
    geo: 'GB',
    data_type: 'TIMESERIES',
    api_key: apiKey,
  })

  const interestOverTime = (
    (data.interest_over_time as Record<string, unknown>)?.timeline_data as Array<Record<string, unknown>> ?? []
  ).map((point: Record<string, unknown>) => ({
    date: point.date,
    values: point.values,
  }))

  // Also get related queries
  const relatedData = await serpApiSearch({
    engine: 'google_trends',
    q: query,
    geo: 'GB',
    data_type: 'RELATED_QUERIES',
    api_key: apiKey,
  })

  const risingQueries = (
    (relatedData.related_queries as Record<string, unknown>)?.rising as Array<Record<string, unknown>> ?? []
  ).map((q: Record<string, unknown>) => ({
    query: q.query,
    value: q.value,
    extracted_value: q.extracted_value,
  }))

  const topQueries = (
    (relatedData.related_queries as Record<string, unknown>)?.top as Array<Record<string, unknown>> ?? []
  ).map((q: Record<string, unknown>) => ({
    query: q.query,
    value: q.value,
    extracted_value: q.extracted_value,
  }))

  return {
    query,
    interest_over_time: interestOverTime.slice(-30), // last 30 data points
    rising_queries: risingQueries.slice(0, 10),
    top_queries: topQueries.slice(0, 10),
  }
}

// -----------------------------------------------------------------------
// Content Angles — PAA + autocomplete suggestions formatted as ideas
// -----------------------------------------------------------------------

async function contentAngles(apiKey: string, query: string, location: string) {
  // Get PAA data
  const searchData = await serpApiSearch({
    engine: 'google',
    q: query,
    location,
    gl: 'uk',
    hl: 'en',
    num: 5,
    api_key: apiKey,
  })

  const paa = ((searchData.related_questions ?? []) as Array<Record<string, unknown>>).map(
    (q: Record<string, unknown>) => ({
      question: q.question,
      snippet: q.snippet,
    })
  )

  // Get autocomplete suggestions
  const autocompleteData = await serpApiSearch({
    engine: 'google_autocomplete',
    q: query,
    gl: 'uk',
    hl: 'en',
    api_key: apiKey,
  })

  const suggestions = ((autocompleteData.suggestions ?? []) as Array<Record<string, unknown>>).map(
    (s: Record<string, unknown>) => ({
      value: s.value,
    })
  )

  // Format as content angle recommendations
  const angles = [
    ...paa.map((p) => ({
      type: 'question' as const,
      angle: String(p.question),
      context: String(p.snippet ?? ''),
      source: 'People Also Ask',
    })),
    ...suggestions.map((s) => ({
      type: 'search_term' as const,
      angle: String(s.value),
      context: 'Real search suggestion — use as hashtag or content hook',
      source: 'Google Autocomplete',
    })),
  ]

  return {
    query,
    angles,
    total: angles.length,
  }
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

  const apiKey = Deno.env.get('SERPAPI_KEY')
  if (!apiKey) {
    return jsonResponse({ error: 'SERPAPI_KEY not configured.' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceRoleKey)

  let body: { action?: string; query?: string; location?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const { action, query, location = 'United Kingdom' } = body

  if (!action) {
    return jsonResponse({ error: 'action is required (keyword_research, trending, competitor, content_angles).' }, 400)
  }
  if (!query) {
    return jsonResponse({ error: 'query is required.' }, 400)
  }

  // --- Rate limiting ---
  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  // Count today's searches
  const { count: todayCount } = await db
    .from('search_usage')
    .select('*', { count: 'exact', head: true })
    .gte('searched_at', `${today}T00:00:00Z`)

  if ((todayCount ?? 0) >= DAILY_SEARCH_CAP) {
    return jsonResponse({
      error: `Daily search limit reached (${DAILY_SEARCH_CAP}/day). Resets at midnight UTC.`,
      limit: DAILY_SEARCH_CAP,
      used_today: todayCount,
    }, 429)
  }

  // Count this month's searches
  const { count: monthCount } = await db
    .from('search_usage')
    .select('*', { count: 'exact', head: true })
    .gte('searched_at', `${monthStart}T00:00:00Z`)

  if ((monthCount ?? 0) >= MONTHLY_SEARCH_CAP) {
    return jsonResponse({
      error: `Monthly search limit reached (${MONTHLY_SEARCH_CAP}/month). Resets on the 1st.`,
      limit: MONTHLY_SEARCH_CAP,
      used_month: monthCount,
    }, 429)
  }

  try {
    // How many SerpAPI calls each action makes
    const apiCallCounts: Record<string, number> = {
      keyword_research: 1,
      competitor: 1,
      trending: 2,
      content_angles: 2,
    }

    let result: unknown
    switch (action) {
      case 'keyword_research':
      case 'competitor':
        result = await keywordResearch(apiKey, query, location)
        break
      case 'trending':
        result = await trendingSearch(apiKey, query)
        break
      case 'content_angles':
        result = await contentAngles(apiKey, query, location)
        break
      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }

    // Log usage
    await db.from('search_usage').insert({
      query,
      action,
      api_calls: apiCallCounts[action] ?? 1,
    })

    // Return result with usage info
    const updatedTodayCount = (todayCount ?? 0) + 1
    const updatedMonthCount = (monthCount ?? 0) + 1
    return jsonResponse({
      ...(result as Record<string, unknown>),
      _usage: {
        today: updatedTodayCount,
        daily_limit: DAILY_SEARCH_CAP,
        month: updatedMonthCount,
        monthly_limit: MONTHLY_SEARCH_CAP,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
