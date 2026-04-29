// YouTube Upload — uploads a Storage-resident video file to YouTube via the
// Data API v3 videos.insert endpoint, using the resumable upload protocol.
//
// POST /functions/v1/youtube-upload
// Body: {
//   video_upload_id: string,
//   variant_id?: string,                  // optional; falls back to file metadata
//   privacy_status?: 'private' | 'unlisted' | 'public'  // default 'private'
// }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { findActiveYouTubeAccount, getFreshGoogleToken } from '../_shared/google-oauth.ts'

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

interface VideoUploadRow {
  id: string
  storage_path: string
  storage_url: string
  file_name: string | null
  size_bytes: number | null
  status: string
}

interface VariantRow {
  id: string
  meta: { title?: string; description?: string; tags?: string[] }
  copy_text: string
  hashtags: string[] | null
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: { video_upload_id?: string; variant_id?: string; privacy_status?: 'private' | 'unlisted' | 'public' }
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }

  if (!body.video_upload_id) return jsonResponse({ error: 'video_upload_id is required' }, 422)

  // Find an active YouTube account
  const yt = await findActiveYouTubeAccount(client)
  if (!yt) {
    return jsonResponse(
      { error: 'No YouTube channel connected. Connect Google on /channels first.' },
      422,
    )
  }

  // Refresh token if needed
  const { access_token } = await getFreshGoogleToken(client, yt.id)

  // Load the video upload row
  const { data: video, error: vErr } = await client
    .from('video_uploads')
    .select('id, storage_path, storage_url, file_name, size_bytes, status')
    .eq('id', body.video_upload_id)
    .single<VideoUploadRow>()
  if (vErr || !video) return jsonResponse({ error: vErr?.message ?? 'Video not found' }, 404)
  if (video.status === 'published') return jsonResponse({ error: 'Already published' }, 409)

  // Pick metadata from the chosen variant if provided, else minimal defaults
  let title = video.file_name ?? 'Untitled'
  let description = ''
  let tags: string[] = []
  if (body.variant_id) {
    const { data: variant } = await client
      .from('content_variants')
      .select('id, meta, copy_text, hashtags')
      .eq('id', body.variant_id)
      .maybeSingle<VariantRow>()
    if (variant) {
      title = variant.meta?.title ?? title
      description = variant.meta?.description ?? variant.copy_text ?? ''
      tags = variant.meta?.tags ?? variant.hashtags ?? []
    }
  }

  await client
    .from('video_uploads')
    .update({ status: 'publishing', status_detail: null, selected_variant_id: body.variant_id ?? null })
    .eq('id', video.id)

  try {
    // 1. Initiate resumable upload
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/*',
          ...(video.size_bytes ? { 'X-Upload-Content-Length': String(video.size_bytes) } : {}),
        },
        body: JSON.stringify({
          snippet: {
            title: title.slice(0, 100),
            description: description.slice(0, 5000),
            tags: tags.slice(0, 30),
            categoryId: '22',  // People & Blogs — safe default
          },
          status: {
            privacyStatus: body.privacy_status ?? 'private',
            selfDeclaredMadeForKids: false,
          },
        }),
      },
    )
    if (!initRes.ok) {
      const text = await initRes.text()
      throw new Error(`YouTube init upload failed (${initRes.status}): ${text}`)
    }
    const uploadUrl = initRes.headers.get('Location')
    if (!uploadUrl) throw new Error('YouTube did not return a Location header for the resumable upload.')

    // 2. Stream the video file from Storage to YouTube. We fetch the public
    //    URL and stream the body straight into the PUT — Deno fetch supports
    //    a ReadableStream body on Edge runtime.
    const fileRes = await fetch(video.storage_url)
    if (!fileRes.ok || !fileRes.body) {
      throw new Error(`Failed to read video from Storage (${fileRes.status})`)
    }
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': fileRes.headers.get('content-type') ?? 'video/mp4',
        ...(video.size_bytes ? { 'Content-Length': String(video.size_bytes) } : {}),
      },
      body: fileRes.body,
    })
    if (!putRes.ok) {
      const text = await putRes.text()
      throw new Error(`YouTube upload PUT failed (${putRes.status}): ${text}`)
    }
    const result = await putRes.json() as { id: string }

    await client
      .from('video_uploads')
      .update({
        status: 'published',
        youtube_video_id: result.id,
        youtube_channel_account_id: yt.id,
        status_detail: null,
      })
      .eq('id', video.id)

    return jsonResponse({
      youtube_video_id: result.id,
      youtube_url: `https://www.youtube.com/watch?v=${result.id}`,
      privacy_status: body.privacy_status ?? 'private',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await client
      .from('video_uploads')
      .update({ status: 'failed', status_detail: message })
      .eq('id', video.id)
    return jsonResponse({ error: message }, 500)
  }
})
