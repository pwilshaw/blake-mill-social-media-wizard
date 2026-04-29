// T063 — Publish Edge Function
// POST /functions/v1/publish
// Body: { campaign_id: string, channel_ids?: string[], scheduled_at?: string }
//
// Fetches approved content variants and creative assets, posts to
// Meta Graph API v22.0 via page access token. Creates ChannelPost records.
// Supports future scheduling via scheduled_at (ISO 8601).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PublishRequestBody {
  campaign_id: string
  channel_ids?: string[]
  scheduled_at?: string
}

interface ContentVariantRow {
  id: string
  platform: string
  copy_text: string
  hashtags: string[]
  call_to_action: string | null
  approval_status: string
}

interface CreativeAssetRow {
  id: string
  file_url: string
  asset_type: string
  platform: string
}

interface ChannelAccountRow {
  id: string
  platform: string
  account_id: string
  account_name: string
  access_token: string
  is_active: boolean
}

interface MetaPostResponse {
  id?: string
  post_id?: string
  error?: { message: string; code: number }
}

// ---------------------------------------------------------------------------
// Meta posting helpers
// ---------------------------------------------------------------------------

async function postToMetaPage(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrl: string | null,
  scheduledPublishTime: number | null
): Promise<string> {
  const endpoint = imageUrl
    ? `https://graph.facebook.com/v22.0/${pageId}/photos`
    : `https://graph.facebook.com/v22.0/${pageId}/feed`

  const body: Record<string, string | boolean | number> = {
    message,
    access_token: accessToken,
  }

  if (imageUrl) {
    body.url = imageUrl
    body.published = scheduledPublishTime === null
    if (scheduledPublishTime !== null) {
      body.scheduled_publish_time = scheduledPublishTime
    }
  } else {
    if (scheduledPublishTime !== null) {
      body.published = false
      body.scheduled_publish_time = scheduledPublishTime
    }
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as MetaPostResponse
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Meta API error ${res.status}`)
  }

  return data.id ?? data.post_id ?? 'unknown'
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: PublishRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { campaign_id, channel_ids, scheduled_at } = body
  if (!campaign_id) return jsonResponse({ error: 'campaign_id is required' }, 422)

  const scheduledPublishTime = scheduled_at
    ? Math.floor(new Date(scheduled_at).getTime() / 1000)
    : null

  try {
    // 1. Fetch approved content variants for this campaign
    const { data: variants, error: variantsError } = await client
      .from('content_variants')
      .select('id, platform, copy_text, hashtags, call_to_action, approval_status')
      .eq('campaign_id', campaign_id)
      .eq('approval_status', 'approved')

    if (variantsError) return jsonResponse({ error: variantsError.message }, 500)
    if (!variants || variants.length === 0) {
      return jsonResponse({ error: 'No approved content variants found for this campaign.' }, 422)
    }

    // 2. Fetch creative assets for this campaign
    const { data: assets } = await client
      .from('creative_assets')
      .select('id, file_url, asset_type, platform')
      .eq('campaign_id', campaign_id)
      .eq('approval_status', 'approved')

    const creativesByPlatform = new Map<string, CreativeAssetRow>()
    for (const asset of (assets ?? []) as CreativeAssetRow[]) {
      if (!creativesByPlatform.has(asset.platform)) {
        creativesByPlatform.set(asset.platform, asset)
      }
    }

    // 3. Fetch channel accounts (filtered if channel_ids provided)
    let channelQuery = client
      .from('channel_accounts')
      .select('id, platform, account_id, account_name, access_token, is_active')
      .eq('is_active', true)

    if (channel_ids && channel_ids.length > 0) {
      channelQuery = channelQuery.in('id', channel_ids)
    }

    const { data: channelAccounts, error: channelsError } = await channelQuery
    if (channelsError) return jsonResponse({ error: channelsError.message }, 500)
    if (!channelAccounts || channelAccounts.length === 0) {
      return jsonResponse({ error: 'No active channel accounts found.' }, 422)
    }

    // 4. Publish per variant × matching channel
    const results: { channel_post_id: string; platform: string; status: string }[] = []

    for (const variant of variants as ContentVariantRow[]) {
      const matchingChannels = (channelAccounts as ChannelAccountRow[]).filter(
        (ch) => ch.platform === variant.platform
      )

      for (const channel of matchingChannels) {
        const creative = creativesByPlatform.get(variant.platform) ?? null

        const fullMessage = [
          variant.copy_text,
          variant.call_to_action,
          variant.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' '),
        ]
          .filter(Boolean)
          .join('\n\n')

        let platformPostId: string | null = null
        let postStatus: 'queued' | 'published' | 'failed' = 'queued'
        let errorMessage: string | null = null

        try {
          if (variant.platform === 'youtube') {
            // YouTube path: find a video_uploads row linked to this campaign +
            // dispatch youtube-upload, which streams the file to YouTube and
            // sets the youtube_video_id on the row.
            const { data: video } = await client
              .from('video_uploads')
              .select('id, youtube_video_id, status')
              .eq('campaign_id', campaign_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (!video) {
              throw new Error('No video uploaded for this campaign yet — upload one on /videos first.')
            }
            if (video.status === 'published' && video.youtube_video_id) {
              platformPostId = video.youtube_video_id
              postStatus = 'published'
            } else {
              const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
              const res = await fetch(`${Deno.env.get('SUPABASE_URL')!}/functions/v1/youtube-upload`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${anonKey}`,
                  'apikey': anonKey,
                },
                body: JSON.stringify({
                  video_upload_id: video.id,
                  variant_id: variant.id,
                  privacy_status: 'public',
                }),
              })
              const payload = await res.json() as { youtube_video_id?: string; error?: string }
              if (!res.ok || !payload.youtube_video_id) {
                throw new Error(payload.error ?? `youtube-upload failed (HTTP ${res.status})`)
              }
              platformPostId = payload.youtube_video_id
              postStatus = 'published'
            }
          } else {
            platformPostId = await postToMetaPage(
              channel.account_id,
              channel.access_token,
              fullMessage,
              creative?.file_url ?? null,
              scheduledPublishTime
            )
            postStatus = scheduledPublishTime !== null ? 'queued' : 'published'
          }
        } catch (err) {
          postStatus = 'failed'
          errorMessage = err instanceof Error ? err.message : 'Unknown publish error'
        }

        // 5. Create ChannelPost record
        const { data: channelPost, error: insertError } = await client
          .from('channel_posts')
          .insert({
            campaign_id,
            channel_account_id: channel.id,
            content_variant_id: variant.id,
            platform_post_id: platformPostId,
            status: postStatus,
            published_at: postStatus === 'published' ? new Date().toISOString() : null,
            impressions: 0,
            clicks: 0,
            engagement_count: 0,
            spend: 0,
            error_message: errorMessage,
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('Failed to insert channel_post:', insertError.message)
        }

        results.push({
          channel_post_id: channelPost?.id ?? 'insert_failed',
          platform: variant.platform,
          status: postStatus,
        })
      }
    }

    return jsonResponse({ campaign_id, published: results }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
