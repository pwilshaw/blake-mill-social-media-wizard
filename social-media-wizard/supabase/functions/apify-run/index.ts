// Apify Proxy.
// POST /functions/v1/apify-run
// Body: { actor_id: string, input: unknown, timeout_secs?: number, memory_mbytes?: number }
//
// Generic proxy used by other functions and (rarely) the frontend. Sits
// behind the same Supabase JWT gateway as everything else in the boss UI.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getApifyToken, runActor } from '../_shared/apify.ts'

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

interface Body {
  actor_id?: string
  input?: unknown
  timeout_secs?: number
  memory_mbytes?: number
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: Body
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }
  if (!body.actor_id) return jsonResponse({ error: 'actor_id is required' }, 422)

  try {
    const token = await getApifyToken(client)
    const items = await runActor(token, body.actor_id, body.input ?? {}, {
      timeoutSecs: body.timeout_secs,
      memoryMbytes: body.memory_mbytes,
    })
    return jsonResponse({ items, count: items.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
})
