// T048 — Contextual triggers Edge Function
// CRUD: GET (list active), POST (create), PATCH (update by id), DELETE (soft delete)

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const activeOnly = url.searchParams.get('active') !== 'false'

  try {
    // -----------------------------------------------------------
    // GET /triggers  — list (active by default)
    // -----------------------------------------------------------
    if (req.method === 'GET') {
      let query = client
        .from('contextual_triggers')
        .select('*')
        .order('created_at', { ascending: false })

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -----------------------------------------------------------
    // POST /triggers  — create
    // -----------------------------------------------------------
    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      const {
        name,
        trigger_type,
        conditions,
        matched_shirts,
        content_template_id,
        cooldown_hours,
        is_active,
      } = body

      if (!name || !trigger_type) {
        return jsonResponse({ error: 'name and trigger_type are required' }, 422)
      }

      const { data, error } = await client
        .from('contextual_triggers')
        .insert({
          name,
          trigger_type,
          conditions: conditions ?? {},
          matched_shirts: matched_shirts ?? [],
          content_template_id: content_template_id ?? null,
          cooldown_hours: cooldown_hours ?? 24,
          is_active: is_active ?? true,
          last_fired_at: null,
        })
        .select()
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data, 201)
    }

    // -----------------------------------------------------------
    // PATCH /triggers?id=<uuid>  — update
    // -----------------------------------------------------------
    if (req.method === 'PATCH') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      // Strip immutable fields
      const { id: _id, last_fired_at: _fired, ...fields } = body

      const { data, error } = await client
        .from('contextual_triggers')
        .update(fields)
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
    // DELETE /triggers?id=<uuid>  — soft delete (set is_active=false)
    // -----------------------------------------------------------
    if (req.method === 'DELETE') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      const { data, error } = await client
        .from('contextual_triggers')
        .update({ is_active: false })
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
