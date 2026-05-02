// Discover YouTube creators via Apify search.
// POST /functions/v1/discover-youtube-creators
// Body: {
//   query: string,                  // e.g. "menswear shirts review"
//   limit?: number,                 // default 25, max 50
//   min_subs?: number,              // optional filter
//   max_subs?: number,
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getApifyToken, runActor } from '../_shared/apify.ts'

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

interface Body {
  query?: string
  limit?: number
  min_subs?: number
  max_subs?: number
}

// Apify YouTube channel search actor output (best-effort schema — actor
// authors evolve fields over time, so we read defensively).
interface ChannelHit {
  channelId?: string
  channelName?: string
  channelTitle?: string
  channelUrl?: string
  url?: string
  numberOfSubscribers?: number | string
  subscriberCount?: number | string
  videoCount?: number
  viewCount?: number | string
  country?: string
  description?: string
  about?: string
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return null
  const cleaned = v.replace(/[^\d.kKmMbB]/g, '').toLowerCase()
  if (!cleaned) return null
  const m = cleaned.match(/^(\d+(?:\.\d+)?)([kmb])?$/)
  if (!m) return Number(cleaned) || null
  const base = parseFloat(m[1])
  const mult = m[2] === 'k' ? 1_000 : m[2] === 'm' ? 1_000_000 : m[2] === 'b' ? 1_000_000_000 : 1
  return Math.round(base * mult)
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: Body
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.query?.trim()) return jsonResponse({ error: 'query is required' }, 422)
  const limit = Math.max(1, Math.min(50, body.limit ?? 25))
  const minSubs = body.min_subs ?? 0
  const maxSubs = body.max_subs ?? Number.MAX_SAFE_INTEGER

  try {
    const token = await getApifyToken(client)
    // Use a maintained YouTube scraper that supports keyword search.
    // The "streamers/youtube-scraper" actor accepts a `searchKeywords` input
    // and returns channels matching the keyword.
    const items = await runActor<ChannelHit>(
      token,
      'streamers/youtube-scraper',
      {
        searchKeywords: body.query,
        searchType: 'channels',
        maxResults: limit,
        proxyConfiguration: { useApifyProxy: true },
      },
      { timeoutSecs: 240, memoryMbytes: 2048 },
    )

    const creators = items
      .map((it) => ({
        channel_id: it.channelId ?? null,
        channel_name: it.channelTitle ?? it.channelName ?? 'Unknown channel',
        channel_url: it.channelUrl ?? it.url ?? (it.channelId ? `https://www.youtube.com/channel/${it.channelId}` : null),
        subscriber_count: toNumber(it.numberOfSubscribers ?? it.subscriberCount),
        video_count: it.videoCount ?? null,
        view_count: toNumber(it.viewCount),
        country: it.country ?? null,
        description: (it.description ?? it.about ?? null)?.slice(0, 600) ?? null,
      }))
      .filter((c) => {
        const subs = c.subscriber_count ?? 0
        return subs >= minSubs && subs <= maxSubs
      })
      // Rank by subscriber count desc by default; UI can re-sort if needed.
      .sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0))

    return jsonResponse({ query: body.query, count: creators.length, creators })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
})
