// T073 — Engagement Edge Function
// GET  /functions/v1/engagement?status=pending_review|flagged  — list replies needing review
// PATCH /functions/v1/engagement                               — update reply status / text

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

type ReviewableStatus = 'pending_review' | 'flagged'

const REVIEWABLE_STATUSES: ReviewableStatus[] = ['pending_review', 'flagged']

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

  // -------------------------------------------------------------------------
  // GET — fetch replies needing review
  // -------------------------------------------------------------------------
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const statusParam = url.searchParams.get('status') as ReviewableStatus | null

    let query = client
      .from('engagement_replies')
      .select('*')
      .order('created_at', { ascending: true })

    if (statusParam) {
      if (!REVIEWABLE_STATUSES.includes(statusParam)) {
        return jsonResponse(
          {
            error: `Invalid status "${statusParam}". Must be one of: ${REVIEWABLE_STATUSES.join(', ')}`,
          },
          422,
        )
      }
      query = query.eq('reply_status', statusParam)
    } else {
      query = query.in('reply_status', REVIEWABLE_STATUSES)
    }

    const { data, error } = await query

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({ replies: data ?? [] })
  }

  // -------------------------------------------------------------------------
  // PATCH — update reply status and/or reply text
  // -------------------------------------------------------------------------
  if (req.method === 'PATCH') {
    let body: {
      id: string
      reply_status?: string
      reply_text?: string
    }

    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { id, reply_status, reply_text } = body

    if (!id || typeof id !== 'string') {
      return jsonResponse({ error: 'id is required' }, 422)
    }

    const updates: Record<string, unknown> = {}

    if (reply_status !== undefined) {
      const validStatuses = ['pending_review', 'auto_sent', 'manually_sent', 'skipped', 'flagged']
      if (!validStatuses.includes(reply_status)) {
        return jsonResponse(
          { error: `Invalid reply_status "${reply_status}". Must be one of: ${validStatuses.join(', ')}` },
          422,
        )
      }
      updates.reply_status = reply_status
    }

    if (reply_text !== undefined) {
      if (typeof reply_text !== 'string') {
        return jsonResponse({ error: 'reply_text must be a string' }, 422)
      }
      updates.reply_text = reply_text
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ error: 'No updatable fields provided' }, 422)
    }

    const { data, error } = await client
      .from('engagement_replies')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    if (!data) {
      return jsonResponse({ error: 'Reply not found' }, 404)
    }

    return jsonResponse({ reply: data })
  }

  // -------------------------------------------------------------------------
  // POST — generate AI reply for a comment using Claude
  // -------------------------------------------------------------------------
  if (req.method === 'POST') {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY is not configured' }, 500)
    }

    let body: { comment_text: string; post_context?: string; reply_id?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const { comment_text, post_context = 'Blake Mill shirt product post', reply_id } = body
    if (!comment_text) {
      return jsonResponse({ error: 'comment_text is required' }, 422)
    }

    // Build the prompt (inlined from engagement-prompts.ts since edge functions can't import from src/)
    const prompt = `You are the community manager for Blake Mill, a men's shirt brand with a sharp, witty, irreverent tone.

## Brand Voice
Blake Mill is an independent men's shirt brand with a dry, witty, irreverent voice. The brand is culturally aware without being try-hard, confident without being arrogant, and playful without being offensive. Replies feel like they come from a smart human, not a corporate account. Never use hollow phrases like "Thanks for your support!" — instead, be specific, be interesting, be Blake Mill.

## Post Context
${post_context}

## Comment to respond to
"${comment_text}"

## Your task
1. Classify sentiment: positive, neutral, negative, or inappropriate
2. Generate a witty, on-brand reply (1-2 sentences). Empty string if inappropriate.
3. Flag negative/inappropriate for human review.

Return ONLY valid JSON:
{
  "sentiment": "positive" | "neutral" | "negative" | "inappropriate",
  "reply_text": "string",
  "reply_status": "pending_review" | "flagged"
}`

    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!claudeRes.ok) {
        const errText = await claudeRes.text()
        return jsonResponse({ error: `Claude API error: ${errText}` }, 502)
      }

      const claudeData = await claudeRes.json() as {
        content: Array<{ type: string; text: string }>
      }

      const rawText = claudeData.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const parsed = JSON.parse(rawText) as {
        sentiment: string
        reply_text: string
        reply_status: string
      }

      // If reply_id provided, update the existing reply record
      if (reply_id) {
        await client
          .from('engagement_replies')
          .update({
            sentiment: parsed.sentiment,
            reply_text: parsed.reply_text,
            reply_status: parsed.reply_status,
          })
          .eq('id', reply_id)
      }

      return jsonResponse({
        sentiment: parsed.sentiment,
        reply_text: parsed.reply_text,
        reply_status: parsed.reply_status,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return jsonResponse({ error: `Reply generation failed: ${message}` }, 500)
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
})
