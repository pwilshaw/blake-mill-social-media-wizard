// T048b — Content templates Edge Function
// CRUD: GET (list), POST (create), PATCH (update), DELETE (soft delete is_active=false)

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
  const platform = url.searchParams.get('platform')
  const includeInactive = url.searchParams.get('include_inactive') === 'true'

  try {
    // -----------------------------------------------------------
    // GET /content-templates  — list
    // -----------------------------------------------------------
    if (req.method === 'GET') {
      let query = client
        .from('content_templates')
        .select('*')
        .order('name', { ascending: true })

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      if (platform) {
        query = query.eq('platform', platform)
      }

      const { data, error } = await query
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -----------------------------------------------------------
    // POST /content-templates  — create
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
        platform: bodyPlatform,
        copy_template,
        hashtag_template,
        cta_template,
        style_preset,
      } = body

      if (!name || !bodyPlatform || !copy_template) {
        return jsonResponse({ error: 'name, platform, and copy_template are required' }, 422)
      }

      const { data, error } = await client
        .from('content_templates')
        .insert({
          name,
          platform: bodyPlatform,
          copy_template,
          hashtag_template: hashtag_template ?? [],
          cta_template: cta_template ?? null,
          style_preset: style_preset ?? null,
          is_active: true,
        })
        .select()
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data, 201)
    }

    // -----------------------------------------------------------
    // PATCH /content-templates?id=<uuid>  — update
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
      const { id: _id, created_at: _created, ...fields } = body

      const { data, error } = await client
        .from('content_templates')
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
    // DELETE /content-templates?id=<uuid>  — soft delete
    // -----------------------------------------------------------
    if (req.method === 'DELETE') {
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      const { data, error } = await client
        .from('content_templates')
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
