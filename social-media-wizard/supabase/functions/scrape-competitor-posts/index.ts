// Scrape recent posts for competitor handles via Apify.
// POST /functions/v1/scrape-competitor-posts
// Body: { competitor_handle_id?: string, limit?: number }
//
// If competitor_handle_id is supplied, scrape just that one. Otherwise loop
// every is_active=true row and scrape each.

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
  competitor_handle_id?: string
  limit?: number
}

interface HandleRow {
  id: string
  platform: 'instagram' | 'youtube' | 'tiktok' | 'facebook'
  handle: string
  label: string | null
}

interface Normalised {
  platform_post_id: string
  published_at: string | null
  content: string | null
  url: string | null
  views: number
  likes: number
  comments: number
  raw: Record<string, unknown>
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: Body
  try { body = await req.json() } catch { body = {} }
  const limit = Math.max(1, Math.min(100, body.limit ?? 25))

  let handles: HandleRow[]
  if (body.competitor_handle_id) {
    const { data } = await client
      .from('competitor_handles')
      .select('id, platform, handle, label')
      .eq('id', body.competitor_handle_id)
      .single<HandleRow>()
    if (!data) return jsonResponse({ error: 'Competitor handle not found' }, 404)
    handles = [data]
  } else {
    const { data } = await client
      .from('competitor_handles')
      .select('id, platform, handle, label')
      .eq('is_active', true)
      .returns<HandleRow[]>()
    handles = data ?? []
  }

  if (handles.length === 0) {
    return jsonResponse({ scraped_handles: 0, posts_upserted: 0, message: 'No active competitor handles.' })
  }

  let token: string
  try { token = await getApifyToken(client) } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }

  const results: Array<{ handle: string; platform: string; upserted: number; error?: string }> = []
  let totalUpserted = 0

  for (const h of handles) {
    try {
      const posts = await scrape(token, h.platform, h.handle, limit)
      if (posts.length === 0) {
        results.push({ handle: h.handle, platform: h.platform, upserted: 0 })
        continue
      }
      const rows = posts.map((p) => ({
        competitor_handle_id: h.id,
        platform_post_id: p.platform_post_id,
        published_at: p.published_at,
        content: p.content,
        url: p.url,
        views: p.views,
        likes: p.likes,
        comments: p.comments,
        engagement_rate_pct: p.views > 0 ? Number(((p.likes + p.comments) / p.views * 100).toFixed(2)) : null,
        raw: p.raw,
      }))
      const { count, error } = await client
        .from('competitor_posts')
        .upsert(rows, { onConflict: 'competitor_handle_id,platform_post_id', count: 'exact' })
      if (error) throw new Error(error.message)
      const n = count ?? rows.length
      totalUpserted += n
      await client
        .from('competitor_handles')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', h.id)
      results.push({ handle: h.handle, platform: h.platform, upserted: n })
    } catch (err) {
      results.push({
        handle: h.handle,
        platform: h.platform,
        upserted: 0,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return jsonResponse({ scraped_handles: handles.length, posts_upserted: totalUpserted, results })
})

async function scrape(
  token: string,
  platform: HandleRow['platform'],
  handle: string,
  limit: number,
): Promise<Normalised[]> {
  switch (platform) {
    case 'instagram': {
      interface IGItem {
        id?: string; shortCode?: string; url?: string
        caption?: string; timestamp?: string
        likesCount?: number; commentsCount?: number; videoViewCount?: number
      }
      const items = await runActor<IGItem>(
        token,
        'apify/instagram-scraper',
        {
          directUrls: [`https://www.instagram.com/${handle.replace(/^@/, '')}/`],
          resultsType: 'posts',
          resultsLimit: limit,
        },
        { timeoutSecs: 240, memoryMbytes: 2048 },
      )
      return items.map((it) => ({
        platform_post_id: it.id ?? it.shortCode ?? it.url ?? crypto.randomUUID(),
        published_at: it.timestamp ?? null,
        content: it.caption ?? null,
        url: it.url ?? null,
        views: it.videoViewCount ?? 0,
        likes: it.likesCount ?? 0,
        comments: it.commentsCount ?? 0,
        raw: it as unknown as Record<string, unknown>,
      }))
    }
    case 'youtube': {
      interface YTItem {
        videoId?: string; id?: string; url?: string
        title?: string; date?: string; publishedAt?: string
        viewCount?: number; likes?: number; commentsCount?: number
      }
      const channelUrl = handle.startsWith('http')
        ? handle
        : handle.startsWith('@')
          ? `https://www.youtube.com/${handle}/videos`
          : `https://www.youtube.com/@${handle}/videos`
      const items = await runActor<YTItem>(
        token,
        'streamers/youtube-scraper',
        { startUrls: [{ url: channelUrl }], maxResults: limit, includeComments: false },
        { timeoutSecs: 240, memoryMbytes: 2048 },
      )
      return items.map((it) => ({
        platform_post_id: it.videoId ?? it.id ?? it.url ?? crypto.randomUUID(),
        published_at: it.date ?? it.publishedAt ?? null,
        content: it.title ?? null,
        url: it.url ?? (it.videoId ? `https://www.youtube.com/watch?v=${it.videoId}` : null),
        views: it.viewCount ?? 0,
        likes: it.likes ?? 0,
        comments: it.commentsCount ?? 0,
        raw: it as unknown as Record<string, unknown>,
      }))
    }
    case 'tiktok': {
      interface TTItem { id?: string; webVideoUrl?: string; text?: string; createTimeISO?: string; playCount?: number; diggCount?: number; commentCount?: number }
      const items = await runActor<TTItem>(
        token,
        'clockworks/tiktok-scraper',
        { profiles: [handle.replace(/^@/, '')], resultsPerPage: limit, shouldDownloadVideos: false },
        { timeoutSecs: 240, memoryMbytes: 2048 },
      )
      return items.map((it) => ({
        platform_post_id: it.id ?? it.webVideoUrl ?? crypto.randomUUID(),
        published_at: it.createTimeISO ?? null,
        content: it.text ?? null,
        url: it.webVideoUrl ?? null,
        views: it.playCount ?? 0,
        likes: it.diggCount ?? 0,
        comments: it.commentCount ?? 0,
        raw: it as unknown as Record<string, unknown>,
      }))
    }
    case 'facebook': {
      interface FBItem { postId?: string; url?: string; text?: string; time?: string; likes?: number; comments?: number; shares?: number }
      const items = await runActor<FBItem>(
        token,
        'apify/facebook-pages-scraper',
        { startUrls: [{ url: handle.startsWith('http') ? handle : `https://www.facebook.com/${handle}` }], resultsLimit: limit },
        { timeoutSecs: 240, memoryMbytes: 2048 },
      )
      return items.map((it) => ({
        platform_post_id: it.postId ?? it.url ?? crypto.randomUUID(),
        published_at: it.time ?? null,
        content: it.text ?? null,
        url: it.url ?? null,
        views: 0,
        likes: it.likes ?? 0,
        comments: (it.comments ?? 0) + (it.shares ?? 0),
        raw: it as unknown as Record<string, unknown>,
      }))
    }
  }
}
