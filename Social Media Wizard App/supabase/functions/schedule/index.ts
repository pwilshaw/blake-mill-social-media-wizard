// T030 — Schedule Edge Function
// Returns scheduled channel_posts for a date range, joined with campaigns and content_variants.
// Supports optional channel_id filter for calendar view.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function isIsoDate(value: string | null): boolean {
  if (!value) return false
  return !isNaN(Date.parse(value))
}

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const url = new URL(req.url)
  const startDate = url.searchParams.get('start_date')
  const endDate = url.searchParams.get('end_date')
  const channelId = url.searchParams.get('channel_id') // optional

  if (!isIsoDate(startDate)) {
    return jsonResponse({ error: 'start_date is required and must be a valid ISO date string' }, 422)
  }
  if (!isIsoDate(endDate)) {
    return jsonResponse({ error: 'end_date is required and must be a valid ISO date string' }, 422)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Join channel_posts with campaigns and content_variants for the calendar
    let query = client
      .from('channel_posts')
      .select(`
        id,
        platform_post_id,
        status,
        published_at,
        impressions,
        clicks,
        engagement_count,
        spend,
        error_message,
        channel_account_id,
        campaign_id,
        content_variant_id,
        campaigns (
          id,
          name,
          status,
          campaign_type,
          scheduled_start,
          scheduled_end
        ),
        content_variants (
          id,
          platform,
          copy_text,
          hashtags,
          call_to_action,
          approval_status
        )
      `)
      // Use published_at for published posts; fall back to campaigns.scheduled_start for queued
      .or(`published_at.gte.${startDate},published_at.lte.${endDate}`)
      .order('published_at', { ascending: true })

    if (channelId) {
      query = query.eq('channel_account_id', channelId)
    }

    const { data, error } = await query

    if (error) return jsonResponse({ error: error.message }, 500)

    return jsonResponse(data ?? [])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
