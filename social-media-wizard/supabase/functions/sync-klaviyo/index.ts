// T055 — Deno Edge Function: sync customer segments from Klaviyo API
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api'
const KLAVIYO_API_VERSION = '2024-10-15'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ----------------------------------------------------------------
// Klaviyo API helpers
// ----------------------------------------------------------------

interface KlaviyoSegment {
  id: string
  attributes: {
    name: string
    profile_count: number
    created: string
    updated: string
  }
}

interface KlaviyoProfile {
  id: string
  attributes: {
    properties?: Record<string, unknown>
  }
}

async function fetchKlaviyoSegments(apiKey: string): Promise<KlaviyoSegment[]> {
  const segments: KlaviyoSegment[] = []
  let url: string | null = `${KLAVIYO_API_BASE}/segments/?page[size]=50`

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: KLAVIYO_API_VERSION,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      throw new Error(`Klaviyo segments request failed: ${res.status} ${await res.text()}`)
    }

    const json = await res.json() as {
      data: KlaviyoSegment[]
      links?: { next?: string | null }
    }

    segments.push(...(json.data ?? []))
    url = json.links?.next ?? null
  }

  return segments
}

async function fetchSegmentProfileCount(apiKey: string, segmentId: string): Promise<number> {
  const res = await fetch(
    `${KLAVIYO_API_BASE}/segments/${segmentId}/profiles/?page[size]=1`,
    {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: KLAVIYO_API_VERSION,
        Accept: 'application/json',
      },
    }
  )

  if (!res.ok) return 0

  const json = await res.json() as {
    data?: KlaviyoProfile[]
    meta?: { total?: number }
  }

  return json.meta?.total ?? json.data?.length ?? 0
}

// ----------------------------------------------------------------
// Attribute inference from Klaviyo segment name
// ----------------------------------------------------------------

function inferStyleFromName(name: string): 'bold' | 'subtle' | 'mixed' | null {
  const lower = name.toLowerCase()
  if (lower.includes('bold') || lower.includes('statement') || lower.includes('vibrant')) return 'bold'
  if (lower.includes('subtle') || lower.includes('classic') || lower.includes('minimal')) return 'subtle'
  if (lower.includes('mixed') || lower.includes('casual')) return 'mixed'
  return null
}

function inferIntentFromName(name: string): 'high' | 'medium' | 'low' | null {
  const lower = name.toLowerCase()
  if (lower.includes('vip') || lower.includes('loyal') || lower.includes('repeat')) return 'high'
  if (lower.includes('prospect') || lower.includes('warm')) return 'medium'
  if (lower.includes('lapsed') || lower.includes('cold') || lower.includes('inactive')) return 'low'
  return null
}

// ----------------------------------------------------------------
// Handler
// ----------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  // Priority: env-var secret > integration_credentials row (UI-managed).
  let klaviyoApiKey = Deno.env.get('KLAVIYO_API_KEY') ?? ''
  if (!klaviyoApiKey) {
    const { data: integration } = await client
      .from('integration_credentials')
      .select('credentials')
      .eq('provider', 'klaviyo')
      .maybeSingle<{ credentials: { api_key?: string } }>()
    klaviyoApiKey = integration?.credentials?.api_key ?? ''
  }
  if (!klaviyoApiKey) {
    return jsonResponse(
      { error: 'No Klaviyo API key configured. Add one in Segments → Connect Klaviyo.' },
      500,
    )
  }

  try {
    const klaviyoSegments = await fetchKlaviyoSegments(klaviyoApiKey)

    const records = await Promise.all(
      klaviyoSegments.map(async (seg) => {
        // Use profile_count from attributes if available; fallback to profile fetch
        const memberCount =
          seg.attributes.profile_count > 0
            ? seg.attributes.profile_count
            : await fetchSegmentProfileCount(klaviyoApiKey, seg.id)

        return {
          name: seg.attributes.name,
          source: 'klaviyo' as const,
          klaviyo_segment_id: seg.id,
          member_count: memberCount,
          style_preference: inferStyleFromName(seg.attributes.name),
          purchase_intent: inferIntentFromName(seg.attributes.name),
          age_range: null,
          purchase_occasions: [],
          last_synced_at: new Date().toISOString(),
        }
      })
    )

    const { error } = await client
      .from('customer_segments')
      .upsert(records, { onConflict: 'klaviyo_segment_id' })

    if (error) return jsonResponse({ error: error.message }, 500)

    return jsonResponse({ synced_count: records.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
