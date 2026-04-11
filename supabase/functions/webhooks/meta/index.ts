// T069 — Meta Webhook Edge Function
// Verifies X-Hub-Signature-256 on all incoming POST requests.
// GET: hub.verify_token subscription verification challenge.
// POST: Processes comment notification events, creates EngagementReply
//       stub records with status 'pending_review'.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
  })
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 signature verification
// ---------------------------------------------------------------------------

async function verifySignature(
  rawBody: Uint8Array,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false

  const expected = signatureHeader.replace('sha256=', '')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, rawBody)
  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison
  if (computed.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaCommentValue {
  from?: { id?: string; name?: string }
  message?: string
  post_id?: string
  comment_id?: string
  created_time?: number
}

interface MetaWebhookEntry {
  id: string
  time: number
  changes?: Array<{
    field: string
    value: MetaCommentValue
  }>
}

interface MetaWebhookPayload {
  object: string
  entry: MetaWebhookEntry[]
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const verifyToken = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN')!
  const appSecret = Deno.env.get('META_APP_SECRET')!

  // Dynamic import to avoid top-level await issues when env vars may not be loaded yet
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // -------------------------------------------------------------------
  // GET — hub subscription verification
  // -------------------------------------------------------------------
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === verifyToken) {
      return textResponse(challenge ?? '')
    }

    return textResponse('Forbidden', 403)
  }

  // -------------------------------------------------------------------
  // POST — webhook event processing
  // -------------------------------------------------------------------
  if (req.method === 'POST') {
    const rawBody = new Uint8Array(await req.arrayBuffer())
    const signatureHeader = req.headers.get('x-hub-signature-256')

    const isValid = await verifySignature(rawBody, signatureHeader, appSecret)
    if (!isValid) {
      return jsonResponse({ error: 'Invalid signature' }, 401)
    }

    let payload: MetaWebhookPayload
    try {
      payload = JSON.parse(new TextDecoder().decode(rawBody)) as MetaWebhookPayload
    } catch {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400)
    }

    if (payload.object !== 'page' && payload.object !== 'instagram') {
      // Acknowledge unsupported objects without processing
      return jsonResponse({ received: true, processed: 0 })
    }

    let processed = 0

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'comments' && change.field !== 'feed') continue

        const value = change.value
        const commentId = value.comment_id ?? `${entry.id}_${entry.time}`
        const postId = value.post_id ?? null
        const commentText = value.message ?? ''
        const authorName = value.from?.name ?? 'Unknown'
        const commentAuthorId = value.from?.id ?? null

        if (!commentText.trim()) continue

        // Attempt to match to an existing channel_post by platform_post_id
        let channelPostId: string | null = null
        if (postId) {
          const { data: matchedPost } = await supabase
            .from('channel_posts')
            .select('id')
            .eq('platform_post_id', postId)
            .limit(1)
            .single()
          channelPostId = matchedPost?.id ?? null
        }

        if (!channelPostId) {
          // Cannot associate without a channel_post — skip but log
          console.warn(`Meta webhook: comment ${commentId} could not be matched to a channel_post. Post ID: ${postId}`)
          continue
        }

        // Create stub EngagementReply with pending_review status
        const { error: insertError } = await supabase.from('engagement_replies').insert({
          channel_post_id: channelPostId,
          platform_comment_id: commentId,
          comment_text: commentText,
          comment_author: authorName,
          comment_author_platform_id: commentAuthorId,
          sentiment: 'neutral', // placeholder; will be updated by comment-check cron
          reply_text: '',
          reply_status: 'pending_review',
          product_nudge_shirt_id: null,
          created_at: value.created_time
            ? new Date(value.created_time * 1000).toISOString()
            : new Date().toISOString(),
          replied_at: null,
        })

        if (insertError) {
          // Duplicate comment_id is likely — ignore constraint violations
          if (!insertError.message.includes('duplicate') && !insertError.message.includes('unique')) {
            console.error('Failed to insert engagement_reply:', insertError.message)
          }
        } else {
          processed++
        }
      }
    }

    return jsonResponse({ received: true, processed })
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
})
