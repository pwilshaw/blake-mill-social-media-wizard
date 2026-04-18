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

  try {
    switch (action) {
      case 'keyword_research':
      case 'competitor':
        return jsonResponse(await keywordResearch(apiKey, query, location))

      case 'trending':
        return jsonResponse(await trendingSearch(apiKey, query))

      case 'content_angles':
        return jsonResponse(await contentAngles(apiKey, query, location))

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
