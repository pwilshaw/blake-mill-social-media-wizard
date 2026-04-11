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

  return jsonResponse({ error: 'Method not allowed' }, 405)
})
