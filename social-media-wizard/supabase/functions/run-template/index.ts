// Run Template — boss clicks "Run now" on a template, or anything else
// kicks a one-shot agent post bound to a template.
//
// POST /functions/v1/run-template
// Body: { template_id: string, trigger?: 'manual_template' | 'schedule' }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let body: { template_id?: string; trigger?: 'manual_template' | 'schedule' }
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }

  if (!body.template_id) return jsonResponse({ error: 'template_id is required' }, 422)

  const { data: tpl } = await client
    .from('agent_templates')
    .select('id, agent_key, name, is_active')
    .eq('id', body.template_id)
    .single()
  if (!tpl) return jsonResponse({ error: 'Template not found' }, 404)
  if (!tpl.is_active) return jsonResponse({ error: 'Template is inactive' }, 422)

  const trigger = body.trigger ?? 'manual_template'
  const respondUrl = `${supabaseUrl}/functions/v1/agent-respond`

  const res = await fetch(respondUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      agent_key: tpl.agent_key,
      trigger,
      template_id: tpl.id,
    }),
  })
  const payload = await res.json()
  if (!res.ok) return jsonResponse(payload, res.status)
  return jsonResponse({ template: { id: tpl.id, name: tpl.name }, ...payload })
})
