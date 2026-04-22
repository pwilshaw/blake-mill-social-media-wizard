// T072 — Comment Check Cron Edge Function
// Fetches new comments from Meta API for all published posts,
// classifies sentiment via Claude, generates replies, and stores EngagementReply records.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getIntegrationKey } from '../_shared/integration-credentials.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelPost {
  id: string
  platform_post_id: string
  channel_account_id: string
}

interface ChannelAccount {
  id: string
  platform: string
  account_id: string
}

interface MetaComment {
  id: string
  message: string
  from: { name: string; id: string }
  created_time: string
}

interface MetaCommentsResponse {
  data: MetaComment[]
  paging?: {
    cursors?: { after?: string }
    next?: string
  }
}

interface ClaudeReplyResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'inappropriate'
  reply_text: string
  reply_status: 'pending_review' | 'flagged'
}

interface EngagementReplyInsert {
  channel_post_id: string
  platform_comment_id: string
  comment_text: string
  comment_author: string
  sentiment: string
  reply_text: string
  reply_status: string
  product_nudge_shirt_id: null
  replied_at: null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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
// Meta API — fetch comments for a post
// ---------------------------------------------------------------------------

async function fetchPostComments(
  platformPostId: string,
  accessToken: string,
): Promise<MetaComment[]> {
  const url = new URL(`${META_API_BASE}/${platformPostId}/comments`)
  url.searchParams.set('fields', 'id,message,from,created_time')
  url.searchParams.set('filter', 'stream')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('limit', '100')

  const comments: MetaComment[] = []
  let nextUrl: string | undefined = url.toString()

  while (nextUrl) {
    const response = await fetch(nextUrl)
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Meta API error for post ${platformPostId}: ${errorText}`)
      break
    }
    const data = await response.json() as MetaCommentsResponse
    comments.push(...(data.data ?? []))
    nextUrl = data.paging?.next
  }

  return comments
}

// ---------------------------------------------------------------------------
// Claude API — classify and generate reply
// ---------------------------------------------------------------------------

function buildCommentPrompt(comment: string, postContext: string): string {
  return `You are the community manager for Blake Mill, a men's shirt brand with a sharp, witty, irreverent tone. The brand never sounds corporate and never uses hollow phrases.

Post context: ${postContext}

Comment: "${comment}"

Classify the comment sentiment (positive/neutral/negative/inappropriate) and write a brand-appropriate reply.

Rules:
- positive/neutral: Write a witty, human reply (1-2 sentences). May include a soft product nudge if natural.
- negative: Acknowledge the concern genuinely without making promises.
- inappropriate: Set reply_text to empty string.
- negative or inappropriate: reply_status must be "flagged".
- positive or neutral: reply_status must be "pending_review".

Return ONLY valid JSON:
{
  "sentiment": "positive" | "neutral" | "negative" | "inappropriate",
  "reply_text": "string",
  "reply_status": "pending_review" | "flagged"
}`
}

async function classifyAndGenerateReply(
  comment: string,
  postContext: string,
  anthropicKey: string,
): Promise<ClaudeReplyResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: buildCommentPrompt(comment, postContext) }],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errorText}`)
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>
  }

  const rawText = data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: ClaudeReplyResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse Claude response: ${cleaned.slice(0, 200)}`)
  }

  if (
    !['positive', 'neutral', 'negative', 'inappropriate'].includes(parsed.sentiment) ||
    typeof parsed.reply_text !== 'string' ||
    !['pending_review', 'flagged'].includes(parsed.reply_status)
  ) {
    throw new Error(`Unexpected Claude response shape: ${cleaned.slice(0, 200)}`)
  }

  return parsed
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const anthropicKey = await getIntegrationKey(client, {
    provider: 'anthropic',
    envVars: ['ANTHROPIC_API_KEY'],
  })
  if (!anthropicKey) {
    return jsonResponse({ error: 'Anthropic API key not configured. Add one in Integrations.' }, 500)
  }

  const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN')
  if (!metaAccessToken) {
    return jsonResponse({ error: 'META_ACCESS_TOKEN is not configured' }, 500)
  }

  // Fetch all published posts with their channel account info
  const { data: posts, error: postsError } = await client
    .from('channel_posts')
    .select('id, platform_post_id, channel_account_id')
    .eq('status', 'published')
    .not('platform_post_id', 'is', null)

  if (postsError) {
    return jsonResponse({ error: postsError.message }, 500)
  }

  if (!posts || posts.length === 0) {
    return jsonResponse({ message: 'No published posts to check', processed: 0 })
  }

  // Fetch channel accounts for access tokens
  const channelAccountIds = [...new Set((posts as ChannelPost[]).map((p) => p.channel_account_id))]

  const { data: channelAccounts, error: channelsError } = await client
    .from('channel_accounts')
    .select('id, platform, account_id')
    .in('id', channelAccountIds)

  if (channelsError) {
    return jsonResponse({ error: channelsError.message }, 500)
  }

  const accountMap = new Map<string, ChannelAccount>()
  for (const account of (channelAccounts ?? []) as ChannelAccount[]) {
    accountMap.set(account.id, account)
  }

  // Fetch existing comment IDs to avoid duplicates
  const { data: existingReplies } = await client
    .from('engagement_replies')
    .select('platform_comment_id')

  const seenCommentIds = new Set<string>(
    (existingReplies ?? []).map((r: { platform_comment_id: string }) => r.platform_comment_id),
  )

  let totalProcessed = 0
  let totalErrors = 0

  for (const post of posts as ChannelPost[]) {
    const account = accountMap.get(post.channel_account_id)
    if (!account) continue

    let comments: MetaComment[]
    try {
      comments = await fetchPostComments(post.platform_post_id, metaAccessToken)
    } catch (err) {
      console.error(`Failed to fetch comments for post ${post.id}:`, err)
      totalErrors++
      continue
    }

    const newComments = comments.filter((c) => !seenCommentIds.has(c.id))
    if (newComments.length === 0) continue

    const postContext = `${account.platform} post by @${account.account_id}`

    for (const comment of newComments) {
      try {
        const result = await classifyAndGenerateReply(
          comment.message,
          postContext,
          anthropicKey,
        )

        const insert: EngagementReplyInsert = {
          channel_post_id: post.id,
          platform_comment_id: comment.id,
          comment_text: comment.message,
          comment_author: comment.from?.name ?? 'Unknown',
          sentiment: result.sentiment,
          reply_text: result.reply_text,
          reply_status: result.reply_status,
          product_nudge_shirt_id: null,
          replied_at: null,
        }

        const { error: insertError } = await client
          .from('engagement_replies')
          .insert(insert)

        if (insertError) {
          console.error(`Failed to insert reply for comment ${comment.id}:`, insertError.message)
          totalErrors++
        } else {
          seenCommentIds.add(comment.id)
          totalProcessed++
        }
      } catch (err) {
        console.error(`Failed to process comment ${comment.id}:`, err)
        totalErrors++
      }
    }
  }

  return jsonResponse({
    message: 'Comment check complete',
    processed: totalProcessed,
    errors: totalErrors,
  })
})
