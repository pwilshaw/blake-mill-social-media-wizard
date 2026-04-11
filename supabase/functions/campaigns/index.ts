// T026 — Campaigns Edge Function
// Supports full CRUD: list, detail, create draft, update, cancel.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const status = url.searchParams.get('status')

  try {
    // -----------------------------------------------------------
    // GET /campaigns?id=<uuid>  — detail
    // -----------------------------------------------------------
    if (req.method === 'GET' && id) {
      const { data, error } = await client
        .from('campaigns')
        .select('*, content_variants(count)')
        .eq('id', id)
        .single()

      if (error) {
        const httpStatus = error.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: error.message }, httpStatus)
      }

      return jsonResponse(data)
    }

    // -----------------------------------------------------------
    // GET /campaigns?status=<status>  — list (with optional filter)
    // -----------------------------------------------------------
    if (req.method === 'GET') {
      let query = client
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -----------------------------------------------------------
    // POST /campaigns  — create draft
    // -----------------------------------------------------------
    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      const { name, campaign_type, target_segments, channels, budget_limit, scheduled_start, scheduled_end, trigger_rule_id } = body

      if (!name || !campaign_type) {
        return jsonResponse({ error: 'name and campaign_type are required' }, 422)
      }

      const { data, error } = await client
        .from('campaigns')
        .insert({
          name,
          campaign_type,
          target_segments: target_segments ?? [],
          channels: channels ?? [],
          budget_limit: budget_limit ?? null,
          scheduled_start: scheduled_start ?? null,
          scheduled_end: scheduled_end ?? null,
          trigger_rule_id: trigger_rule_id ?? null,
          status: 'draft',
          budget_spent: 0,
          auto_approved: false,
        })
        .select()
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data, 201)
    }

    // -----------------------------------------------------------
    // PATCH /campaigns?id=<uuid>  — update fields
    // -----------------------------------------------------------
    if (req.method === 'PATCH') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      // Strip protected fields
      const { id: _id, budget_spent: _spent, created_at: _created, ...fields } = body

      const { data, error } = await client
        .from('campaigns')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const httpStatus = error.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: error.message }, httpStatus)
      }

      return jsonResponse(data)
    }

    // -----------------------------------------------------------
    // DELETE /campaigns?id=<uuid>  — cancel (soft delete via status)
    // -----------------------------------------------------------
    if (req.method === 'DELETE') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      const { data, error } = await client
        .from('campaigns')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const httpStatus = error.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: error.message }, httpStatus)
      }

      return jsonResponse(data)
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
