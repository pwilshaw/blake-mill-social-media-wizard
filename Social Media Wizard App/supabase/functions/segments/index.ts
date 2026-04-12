// T056 — Deno Edge Function: CRUD for customer_segments
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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const source = url.searchParams.get('source')
  const stylePreference = url.searchParams.get('style_preference')

  try {
    // ----------------------------------------------------------------
    // GET /segments?id=<uuid>  — detail
    // ----------------------------------------------------------------
    if (req.method === 'GET' && id) {
      const { data, error } = await client
        .from('customer_segments')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        const httpStatus = error.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: error.message }, httpStatus)
      }

      return jsonResponse(data)
    }

    // ----------------------------------------------------------------
    // GET /segments  — list (with optional filters)
    // ----------------------------------------------------------------
    if (req.method === 'GET') {
      let query = client
        .from('customer_segments')
        .select('*')
        .order('name', { ascending: true })

      if (source) {
        query = query.eq('source', source)
      }

      if (stylePreference) {
        query = query.eq('style_preference', stylePreference)
      }

      const { data, error } = await query

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // ----------------------------------------------------------------
    // POST /segments  — create manual segment
    // ----------------------------------------------------------------
    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      const { name } = body

      if (!name || typeof name !== 'string') {
        return jsonResponse({ error: '"name" is required' }, 422)
      }

      const { data, error } = await client
        .from('customer_segments')
        .insert({
          name,
          source: 'manual',
          age_range: body.age_range ?? null,
          style_preference: body.style_preference ?? null,
          purchase_occasions: body.purchase_occasions ?? [],
          purchase_intent: body.purchase_intent ?? null,
          klaviyo_segment_id: null,
          member_count: body.member_count ?? null,
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data, 201)
    }

    // ----------------------------------------------------------------
    // PATCH /segments?id=<uuid>  — update
    // ----------------------------------------------------------------
    if (req.method === 'PATCH') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      let body: Record<string, unknown>
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      // Strip immutable fields before update
      const fields = Object.fromEntries(
        Object.entries(body).filter(([k]) => k !== 'id' && k !== 'source')
      )

      const { data, error } = await client
        .from('customer_segments')
        .update({ ...fields, last_synced_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        const httpStatus = error.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: error.message }, httpStatus)
      }

      return jsonResponse(data)
    }

    // ----------------------------------------------------------------
    // DELETE /segments?id=<uuid>
    // ----------------------------------------------------------------
    if (req.method === 'DELETE') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      const { error } = await client
        .from('customer_segments')
        .delete()
        .eq('id', id)

      if (error) {
        const httpStatus = error.code === 'PGRST116' ? 404 : 500
        return jsonResponse({ error: error.message }, httpStatus)
      }

      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
