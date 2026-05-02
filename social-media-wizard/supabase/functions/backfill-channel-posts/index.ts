// Backfill historical posts for a connected channel via Apify scrapers.
// Upserts into channel_posts so /insights and the agents see real history
// even for posts published outside this app.
//
// POST /functions/v1/backfill-channel-posts
// Body: {
//   channel_account_id: string,
//   handle: string,         // e.g. 'blakemill' for IG, channel handle for YouTube
//   limit?: number,         // default 50
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
  channel_account_id?: string
  handle?: string
  limit?: number
}

interface ChannelAccountRow {
  id: string
  platform: string
  account_name: string
}

// Generic shape we coerce each platform's actor output into.
interface NormalisedPost {
  platform_post_id: string
  published_at: string | null
  content: string | null
  impressions: number
  clicks: number
  engagement_count: number
  url: string | null
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: Body
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.channel_account_id) return jsonResponse({ error: 'channel_account_id is required' }, 422)
  if (!body.handle) return jsonResponse({ error: 'handle is required' }, 422)
  const limit = Math.max(1, Math.min(200, body.limit ?? 50))

  const { data: channel, error: chErr } = await client
    .from('channel_accounts')
    .select('id, platform, account_name')
    .eq('id', body.channel_account_id)
    .single<ChannelAccountRow>()
  if (chErr || !channel) return jsonResponse({ error: chErr?.message ?? 'Channel account not found' }, 404)

  let posts: NormalisedPost[]
  try {
    const token = await getApifyToken(client)
    posts = await scrapeForPlatform(token, channel.platform, body.handle, limit)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: `Scrape failed: ${message}` }, 502)
  }

  if (posts.length === 0) {
    return jsonResponse({ inserted: 0, updated: 0, total: 0, message: 'No posts returned by scraper.' })
  }

  // Upsert keyed on (channel_account_id, platform_post_id) — the unique index
  // we added in migration 023.
  const rows = posts.map((p) => ({
    channel_account_id: channel.id,
    content_variant_id: null,
    campaign_id: null,
    platform_post_id: p.platform_post_id,
    status: 'published' as const,
    published_at: p.published_at,
    impressions: p.impressions,
    clicks: p.clicks,
    engagement_count: p.engagement_count,
    spend: 0,
    error_message: null,
    source: 'apify_backfill',
  }))

  const { error: upsertErr, count } = await client
    .from('channel_posts')
    .upsert(rows, { onConflict: 'channel_account_id,platform_post_id', count: 'exact' })

  if (upsertErr) return jsonResponse({ error: upsertErr.message }, 500)

  return jsonResponse({
    platform: channel.platform,
    handle: body.handle,
    scraped: posts.length,
    upserted: count ?? posts.length,
  })
})

// ---------------------------------------------------------------------------
// Per-platform scrapers (normalised to NormalisedPost)
// ---------------------------------------------------------------------------

async function scrapeForPlatform(
  token: string,
  platform: string,
  handle: string,
  limit: number,
): Promise<NormalisedPost[]> {
  switch (platform) {
    case 'instagram':
      return await scrapeInstagram(token, handle, limit)
    case 'youtube':
      return await scrapeYouTube(token, handle, limit)
    case 'facebook':
      return await scrapeFacebook(token, handle, limit)
    default:
      throw new Error(`Backfill not yet supported for platform "${platform}"`)
  }
}

interface InstagramItem {
  id?: string
  shortCode?: string
  url?: string
  caption?: string
  timestamp?: string
  likesCount?: number
  commentsCount?: number
  videoViewCount?: number
}

async function scrapeInstagram(token: string, handle: string, limit: number): Promise<NormalisedPost[]> {
  const items = await runActor<InstagramItem>(
    token,
    'apify/instagram-scraper',
    {
      directUrls: [`https://www.instagram.com/${handle.replace(/^@/, '')}/`],
      resultsType: 'posts',
      resultsLimit: limit,
      addParentData: false,
    },
    { timeoutSecs: 240, memoryMbytes: 2048 },
  )
  return items.map((it) => ({
    platform_post_id: it.id ?? it.shortCode ?? it.url ?? crypto.randomUUID(),
    published_at: it.timestamp ?? null,
    content: it.caption ?? null,
    impressions: it.videoViewCount ?? 0,
    clicks: 0,
    engagement_count: (it.likesCount ?? 0) + (it.commentsCount ?? 0),
    url: it.url ?? null,
  }))
}

interface YouTubeItem {
  id?: string
  videoId?: string
  title?: string
  text?: string  // description
  url?: string
  date?: string
  publishedAt?: string
  viewCount?: number
  likes?: number
  commentsCount?: number
}

async function scrapeYouTube(token: string, handle: string, limit: number): Promise<NormalisedPost[]> {
  const channelUrl = handle.startsWith('http')
    ? handle
    : handle.startsWith('@')
      ? `https://www.youtube.com/${handle}/videos`
      : `https://www.youtube.com/@${handle}/videos`
  const items = await runActor<YouTubeItem>(
    token,
    'streamers/youtube-scraper',
    {
      startUrls: [{ url: channelUrl }],
      maxResults: limit,
      includeComments: false,
    },
    { timeoutSecs: 240, memoryMbytes: 2048 },
  )
  return items.map((it) => ({
    platform_post_id: it.videoId ?? it.id ?? it.url ?? crypto.randomUUID(),
    published_at: it.date ?? it.publishedAt ?? null,
    content: it.title ?? it.text ?? null,
    impressions: it.viewCount ?? 0,
    clicks: 0,
    engagement_count: (it.likes ?? 0) + (it.commentsCount ?? 0),
    url: it.url ?? (it.videoId ? `https://www.youtube.com/watch?v=${it.videoId}` : null),
  }))
}

interface FacebookItem {
  postId?: string
  url?: string
  text?: string
  time?: string
  likes?: number
  comments?: number
  shares?: number
}

async function scrapeFacebook(token: string, handle: string, limit: number): Promise<NormalisedPost[]> {
  const items = await runActor<FacebookItem>(
    token,
    'apify/facebook-pages-scraper',
    {
      startUrls: [{ url: handle.startsWith('http') ? handle : `https://www.facebook.com/${handle}` }],
      resultsLimit: limit,
    },
    { timeoutSecs: 240, memoryMbytes: 2048 },
  )
  return items.map((it) => ({
    platform_post_id: it.postId ?? it.url ?? crypto.randomUUID(),
    published_at: it.time ?? null,
    content: it.text ?? null,
    impressions: 0,
    clicks: 0,
    engagement_count: (it.likes ?? 0) + (it.comments ?? 0) + (it.shares ?? 0),
    url: it.url ?? null,
  }))
}
