// T074 — Send Reply Edge Function
// POST /functions/v1/engagement/send-reply
// Body: { reply_id: string, manual?: boolean }
// Posts the reply_text to Meta Graph API as a comment reply.
// Updates reply_status to auto_sent or manually_sent and sets replied_at.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const META_API_VERSION = 'v22.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

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

interface EngagementReply {
  id: string
  platform_comment_id: string
  reply_text: string
  reply_status: string
  channel_post_id: string
}

interface ChannelPost {
  id: string
  channel_account_id: string
}

// ---------------------------------------------------------------------------
// Meta API — post a comment reply
// ---------------------------------------------------------------------------

async function postCommentReply(
  commentId: string,
  message: string,
  accessToken: string,
): Promise<string> {
  const url = `${META_API_BASE}/${commentId}/comments`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, access_token: accessToken }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Meta API error ${response.status}: ${errorText}`)
  }

  const data = await response.json() as { id: string }
  return data.id
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN')
  if (!metaAccessToken) {
    return jsonResponse({ error: 'META_ACCESS_TOKEN is not configured' }, 500)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: { reply_id: string; manual?: boolean }

  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { reply_id, manual = false } = body

  if (!reply_id || typeof reply_id !== 'string') {
    return jsonResponse({ error: 'reply_id is required' }, 422)
  }

  // Fetch the engagement reply
  const { data: reply, error: replyError } = await client
    .from('engagement_replies')
    .select('id, platform_comment_id, reply_text, reply_status, channel_post_id')
    .eq('id', reply_id)
    .single()

  if (replyError || !reply) {
    return jsonResponse({ error: 'Reply not found' }, 404)
  }

  const engagementReply = reply as EngagementReply

  if (!engagementReply.reply_text.trim()) {
    return jsonResponse({ error: 'Reply text is empty — cannot send' }, 422)
  }

  if (['auto_sent', 'manually_sent'].includes(engagementReply.reply_status)) {
    return jsonResponse({ error: 'Reply has already been sent' }, 409)
  }

  // Fetch the channel post to resolve the channel account
  const { data: channelPost, error: postError } = await client
    .from('channel_posts')
    .select('id, channel_account_id')
    .eq('id', engagementReply.channel_post_id)
    .single()

  if (postError || !channelPost) {
    return jsonResponse({ error: 'Channel post not found' }, 404)
  }

  const post = channelPost as ChannelPost

  // Post the reply to Meta
  let platformReplyId: string
  try {
    platformReplyId = await postCommentReply(
      engagementReply.platform_comment_id,
      engagementReply.reply_text,
      metaAccessToken,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: `Failed to post reply to Meta: ${message}` }, 502)
  }

  // Update the reply record
  const newStatus = manual ? 'manually_sent' : 'auto_sent'
  const repliedAt = new Date().toISOString()

  const { data: updated, error: updateError } = await client
    .from('engagement_replies')
    .update({
      reply_status: newStatus,
      replied_at: repliedAt,
    })
    .eq('id', reply_id)
    .select()
    .single()

  if (updateError) {
    // Reply was sent but we failed to update the record — log and return partial success
    console.error(`Reply sent (platform_id: ${platformReplyId}) but failed to update record:`, updateError.message)
    return jsonResponse(
      {
        warning: 'Reply posted but record update failed',
        platform_reply_id: platformReplyId,
        channel_account_id: post.channel_account_id,
      },
      207,
    )
  }

  return jsonResponse({
    reply: updated,
    platform_reply_id: platformReplyId,
  })
})
