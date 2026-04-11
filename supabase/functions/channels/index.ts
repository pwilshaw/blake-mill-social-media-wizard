// T062 — Channels Edge Function
// GET    /channels               — list connected channel accounts
// POST   /channels/connect       — initiate Meta OAuth (returns oauth_url)
// POST   /channels/callback      — exchange code for token, store in Supabase
// DELETE /channels?id=<uuid>     — disconnect a channel account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

interface MetaMeResponse {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  const url = new URL(req.url)
  // Strip the function name prefix so path starts with "/"
  const pathSegments = url.pathname.replace(/^\/functions\/v1\/channels/, '').replace(/^\//, '')
  const subPath = pathSegments ? `/${pathSegments}` : '/'

  const metaAppId = Deno.env.get('META_APP_ID')!
  const metaAppSecret = Deno.env.get('META_APP_SECRET')!
  const redirectUri = Deno.env.get('META_OAUTH_REDIRECT_URI')!

  try {
    // -------------------------------------------------------------------
    // GET /  — list channel accounts
    // -------------------------------------------------------------------
    if (req.method === 'GET' && subPath === '/') {
      const { data, error } = await client
        .from('channel_accounts')
        .select('id, platform, account_name, account_id, token_expires_at, is_active, default_budget_limit, created_at')
        .order('created_at', { ascending: false })

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -------------------------------------------------------------------
    // POST /connect  — initiate Meta OAuth
    // -------------------------------------------------------------------
    if (req.method === 'POST' && subPath === '/connect') {
      let body: { platform?: string } = {}
      try {
        body = await req.json()
      } catch {
        // no-op; platform defaults below
      }

      const platform = body.platform ?? 'facebook'

      // Only Meta (Facebook/Instagram) OAuth is supported in this phase.
      if (platform !== 'facebook' && platform !== 'instagram') {
        return jsonResponse({ error: `OAuth for platform "${platform}" is not yet supported.` }, 422)
      }

      const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish',
        'ads_read',
      ].join(',')

      const state = crypto.randomUUID()
      const oauthUrl = new URL('https://www.facebook.com/v22.0/dialog/oauth')
      oauthUrl.searchParams.set('client_id', metaAppId)
      oauthUrl.searchParams.set('redirect_uri', redirectUri)
      oauthUrl.searchParams.set('scope', scopes)
      oauthUrl.searchParams.set('state', state)
      oauthUrl.searchParams.set('response_type', 'code')

      return jsonResponse({ oauth_url: oauthUrl.toString(), state })
    }

    // -------------------------------------------------------------------
    // POST /callback  — exchange code for token, persist channel account
    // -------------------------------------------------------------------
    if (req.method === 'POST' && subPath === '/callback') {
      let body: { code?: string; platform?: string } = {}
      try {
        body = await req.json()
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400)
      }

      const { code, platform = 'facebook' } = body
      if (!code) return jsonResponse({ error: 'code is required' }, 422)

      // Exchange code for short-lived token
      const tokenUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
      tokenUrl.searchParams.set('client_id', metaAppId)
      tokenUrl.searchParams.set('client_secret', metaAppSecret)
      tokenUrl.searchParams.set('redirect_uri', redirectUri)
      tokenUrl.searchParams.set('code', code)

      const tokenRes = await fetch(tokenUrl.toString())
      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        return jsonResponse({ error: `Token exchange failed: ${err}` }, 502)
      }
      const tokenData = (await tokenRes.json()) as MetaTokenResponse

      // Exchange for long-lived token
      const longLivedUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', metaAppId)
      longLivedUrl.searchParams.set('client_secret', metaAppSecret)
      longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

      const longRes = await fetch(longLivedUrl.toString())
      if (!longRes.ok) {
        const err = await longRes.text()
        return jsonResponse({ error: `Long-lived token exchange failed: ${err}` }, 502)
      }
      const longData = (await longRes.json()) as MetaTokenResponse

      // Fetch account identity
      const meRes = await fetch(
        `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${longData.access_token}`
      )
      const meData = (await meRes.json()) as MetaMeResponse

      // Token expires 60 days from now (long-lived page token is non-expiring but we store a sentinel)
      const expiresAt = new Date(
        Date.now() + (longData.expires_in ? longData.expires_in * 1000 : 60 * 24 * 60 * 60 * 1000)
      ).toISOString()

      // Upsert into channel_accounts (keyed on platform + account_id)
      const { data, error } = await client
        .from('channel_accounts')
        .upsert(
          {
            platform,
            account_id: meData.id,
            account_name: meData.name,
            access_token: longData.access_token,
            token_expires_at: expiresAt,
            is_active: true,
          },
          { onConflict: 'platform,account_id' }
        )
        .select('id, platform, account_name, account_id, is_active, token_expires_at')
        .single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data, 201)
    }

    // -------------------------------------------------------------------
    // DELETE /?id=<uuid>  — disconnect channel account
    // -------------------------------------------------------------------
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      const { error } = await client
        .from('channel_accounts')
        .update({ is_active: false, access_token: null })
        .eq('id', id)

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ disconnected: true })
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
