// T062 — Channels Edge Function (Multi-platform OAuth)
// GET    /channels               — list connected channel accounts
// POST   /channels/connect       — initiate OAuth for any platform
// POST   /channels/callback      — exchange code for token (JSON body)
// GET    /channels/callback      — handle OAuth redirect from platform
// DELETE /channels?id=<uuid>     — disconnect a channel account
// GET    /channels/status        — which platforms have API keys configured

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
// Platform OAuth configs
// ---------------------------------------------------------------------------

function getPlatformConfigs(baseRedirectUri: string) {
  const metaAppId = Deno.env.get('META_APP_ID') ?? ''
  const metaAppSecret = Deno.env.get('META_APP_SECRET') ?? ''
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
  const tiktokAppId = Deno.env.get('TIKTOK_APP_ID') ?? ''
  const tiktokSecret = Deno.env.get('TIKTOK_SECRET') ?? ''
  const snapClientId = Deno.env.get('SNAP_CLIENT_ID') ?? ''
  const snapClientSecret = Deno.env.get('SNAP_CLIENT_SECRET') ?? ''
  const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID') ?? ''
  const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? ''

  return {
    facebook: {
      platform: 'facebook',
      authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
      clientId: metaAppId,
      clientSecret: metaAppSecret,
      scopes: 'pages_show_list,pages_read_engagement,pages_manage_posts,ads_read,ads_management',
      redirectUri: baseRedirectUri,
      configured: Boolean(metaAppId && metaAppSecret),
    },
    instagram: {
      platform: 'instagram',
      authUrl: 'https://www.facebook.com/v22.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v22.0/oauth/access_token',
      clientId: metaAppId,
      clientSecret: metaAppSecret,
      scopes: 'instagram_basic,instagram_content_publish,instagram_manage_comments,pages_show_list',
      redirectUri: baseRedirectUri,
      configured: Boolean(metaAppId && metaAppSecret),
    },
    google_ads: {
      platform: 'google_ads',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      scopes: 'https://www.googleapis.com/auth/adwords',
      redirectUri: baseRedirectUri,
      configured: Boolean(googleClientId && googleClientSecret),
    },
    tiktok: {
      platform: 'tiktok',
      authUrl: 'https://business-api.tiktok.com/portal/auth',
      tokenUrl: 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
      clientId: tiktokAppId,
      clientSecret: tiktokSecret,
      scopes: 'ad.read,ad.write,creative.read',
      redirectUri: baseRedirectUri,
      configured: Boolean(tiktokAppId && tiktokSecret),
    },
    snapchat: {
      platform: 'snapchat',
      authUrl: 'https://accounts.snapchat.com/login/oauth2/authorize',
      tokenUrl: 'https://accounts.snapchat.com/login/oauth2/access_token',
      clientId: snapClientId,
      clientSecret: snapClientSecret,
      scopes: 'snapchat-marketing-api',
      redirectUri: baseRedirectUri,
      configured: Boolean(snapClientId && snapClientSecret),
    },
    linkedin: {
      platform: 'linkedin',
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientId: linkedinClientId,
      clientSecret: linkedinClientSecret,
      scopes: 'r_organization_social,w_organization_social,rw_ads',
      redirectUri: baseRedirectUri,
      configured: Boolean(linkedinClientId && linkedinClientSecret),
    },
  } as Record<string, {
    platform: string; authUrl: string; tokenUrl: string
    clientId: string; clientSecret: string; scopes: string
    redirectUri: string; configured: boolean
  }>
}

// ---------------------------------------------------------------------------
// Token exchange helpers
// ---------------------------------------------------------------------------

async function exchangeMetaToken(
  config: { clientId: string; clientSecret: string; tokenUrl: string; redirectUri: string },
  code: string,
) {
  const tokenUrl = new URL(config.tokenUrl)
  tokenUrl.searchParams.set('client_id', config.clientId)
  tokenUrl.searchParams.set('client_secret', config.clientSecret)
  tokenUrl.searchParams.set('redirect_uri', config.redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString())
  if (!tokenRes.ok) throw new Error(`Meta token exchange failed: ${await tokenRes.text()}`)
  const tokenData = await tokenRes.json()

  const longUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
  longUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longUrl.searchParams.set('client_id', config.clientId)
  longUrl.searchParams.set('client_secret', config.clientSecret)
  longUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

  const longRes = await fetch(longUrl.toString())
  if (!longRes.ok) throw new Error(`Meta long-lived token failed: ${await longRes.text()}`)
  const longData = await longRes.json()

  const meRes = await fetch(`https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${longData.access_token}`)
  const meData = await meRes.json()

  return {
    access_token: longData.access_token,
    expires_in: longData.expires_in ?? 5184000,
    account_id: meData.id,
    account_name: meData.name ?? 'Facebook',
  }
}

async function exchangeStandardOAuth(
  config: { clientId: string; clientSecret: string; tokenUrl: string; redirectUri: string; platform: string },
  code: string,
) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!tokenRes.ok) throw new Error(`${config.platform} token exchange failed: ${await tokenRes.text()}`)
  const tokenData = await tokenRes.json()

  return {
    access_token: tokenData.access_token,
    expires_in: tokenData.expires_in ?? 3600,
    account_id: tokenData.advertiser_id ?? tokenData.sub ?? crypto.randomUUID(),
    account_name: tokenData.display_name ?? tokenData.name ?? config.platform,
  }
}

async function exchangeTikTokToken(
  config: { clientId: string; clientSecret: string; tokenUrl: string },
  code: string,
) {
  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: config.clientId, secret: config.clientSecret, auth_code: code }),
  })
  if (!tokenRes.ok) throw new Error(`TikTok token exchange failed: ${await tokenRes.text()}`)
  const result = await tokenRes.json()
  const data = result.data ?? result

  return {
    access_token: data.access_token,
    expires_in: data.expires_in ?? 86400,
    account_id: data.advertiser_id ?? crypto.randomUUID(),
    account_name: data.display_name ?? 'TikTok Ads',
  }
}

// ---------------------------------------------------------------------------
// Route extraction — works regardless of how Supabase passes the URL
// ---------------------------------------------------------------------------

function extractSubPath(req: Request): string {
  const url = new URL(req.url)
  const pathname = url.pathname

  // Supabase may pass /functions/v1/channels/... or just /channels/... or just /
  // Try to extract the part after "channels"
  const match = pathname.match(/\/channels(.*)/)
  if (match) {
    const rest = match[1] || '/'
    return rest === '' ? '/' : rest
  }

  // Fallback: treat the whole path as the sub-path
  return pathname === '' || pathname === '/' ? '/' : pathname
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
  const subPath = extractSubPath(req)

  const callbackUri = `${supabaseUrl}/functions/v1/channels/callback`
  const configs = getPlatformConfigs(callbackUri)
  const appUrl = Deno.env.get('SHOPIFY_APP_URL') ?? 'https://blake-mill-social-media-wizard.vercel.app'

  try {
    // -------------------------------------------------------------------
    // GET /status
    // -------------------------------------------------------------------
    if (req.method === 'GET' && subPath === '/status') {
      const status: Record<string, boolean> = {}
      for (const [key, config] of Object.entries(configs)) {
        status[key] = config.configured
      }
      const { count } = await client
        .from('shopify_stores')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      status['shopify'] = (count ?? 0) > 0
      return jsonResponse(status)
    }

    // -------------------------------------------------------------------
    // GET / — list channel accounts
    // -------------------------------------------------------------------
    if (req.method === 'GET' && (subPath === '/' || subPath === '')) {
      const { data, error } = await client
        .from('channel_accounts')
        .select('id, platform, account_name, account_id, token_expires_at, is_active, default_budget_limit, created_at')
        .order('created_at', { ascending: false })

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    // -------------------------------------------------------------------
    // POST /connect
    // -------------------------------------------------------------------
    if (req.method === 'POST' && subPath === '/connect') {
      let body: { platform?: string } = {}
      try { body = await req.json() } catch { /* no-op */ }

      const platform = body.platform ?? 'facebook'
      const config = configs[platform]

      if (!config) {
        return jsonResponse({ error: `Unknown platform: ${platform}` }, 400)
      }

      if (!config.configured) {
        return jsonResponse({
          error: `${platform} API is not configured yet. Add the API keys to Supabase secrets.`,
          setup_required: true,
          platform,
        }, 422)
      }

      const state = `${platform}:${crypto.randomUUID()}`

      if (platform === 'tiktok') {
        const authUrl = new URL(config.authUrl)
        authUrl.searchParams.set('app_id', config.clientId)
        authUrl.searchParams.set('redirect_uri', config.redirectUri)
        authUrl.searchParams.set('state', state)
        return jsonResponse({ oauth_url: authUrl.toString(), state })
      }

      const authUrl = new URL(config.authUrl)
      authUrl.searchParams.set('client_id', config.clientId)
      authUrl.searchParams.set('redirect_uri', config.redirectUri)
      authUrl.searchParams.set('scope', config.scopes)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('response_type', 'code')

      if (platform === 'google_ads') {
        authUrl.searchParams.set('access_type', 'offline')
        authUrl.searchParams.set('prompt', 'consent')
      }

      return jsonResponse({ oauth_url: authUrl.toString(), state })
    }

    // -------------------------------------------------------------------
    // GET /callback — browser redirect from OAuth provider
    // -------------------------------------------------------------------
    if (req.method === 'GET' && subPath.startsWith('/callback')) {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state') ?? ''
      const platform = state.split(':')[0] || 'facebook'
      const errorParam = url.searchParams.get('error')

      if (errorParam) {
        const errorDesc = url.searchParams.get('error_description') ?? errorParam
        return Response.redirect(`${appUrl}/channels?error=${encodeURIComponent(errorDesc)}`, 302)
      }

      if (!code) {
        return Response.redirect(`${appUrl}/channels?error=${encodeURIComponent('No authorization code received')}`, 302)
      }

      const config = configs[platform]
      if (!config || !config.configured) {
        return Response.redirect(`${appUrl}/channels?error=${encodeURIComponent(`${platform} not configured`)}`, 302)
      }

      try {
        let tokenResult: { access_token: string; expires_in: number; account_id: string; account_name: string }

        if (platform === 'facebook' || platform === 'instagram') {
          tokenResult = await exchangeMetaToken(config, code)
        } else if (platform === 'tiktok') {
          tokenResult = await exchangeTikTokToken(config, code)
        } else {
          tokenResult = await exchangeStandardOAuth(config, code)
        }

        const expiresAt = new Date(Date.now() + tokenResult.expires_in * 1000).toISOString()

        await client.from('channel_accounts').upsert(
          {
            platform,
            account_id: tokenResult.account_id,
            account_name: tokenResult.account_name,
            access_token: tokenResult.access_token,
            token_expires_at: expiresAt,
            is_active: true,
          },
          { onConflict: 'platform,account_id' }
        )

        return Response.redirect(`${appUrl}/channels?connected=${platform}`, 302)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Token exchange failed'
        return Response.redirect(`${appUrl}/channels?error=${encodeURIComponent(msg)}`, 302)
      }
    }

    // -------------------------------------------------------------------
    // POST /callback — JSON exchange (alternative)
    // -------------------------------------------------------------------
    if (req.method === 'POST' && subPath.startsWith('/callback')) {
      let body: { code?: string; platform?: string; state?: string } = {}
      try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400) }

      const { code, state } = body
      const platform = body.platform ?? state?.split(':')[0] ?? 'facebook'
      if (!code) return jsonResponse({ error: 'code is required' }, 422)

      const config = configs[platform]
      if (!config || !config.configured) return jsonResponse({ error: `${platform} is not configured` }, 422)

      let tokenResult: { access_token: string; expires_in: number; account_id: string; account_name: string }
      if (platform === 'facebook' || platform === 'instagram') {
        tokenResult = await exchangeMetaToken(config, code)
      } else if (platform === 'tiktok') {
        tokenResult = await exchangeTikTokToken(config, code)
      } else {
        tokenResult = await exchangeStandardOAuth(config, code)
      }

      const expiresAt = new Date(Date.now() + tokenResult.expires_in * 1000).toISOString()
      const { data, error } = await client.from('channel_accounts').upsert(
        {
          platform,
          account_id: tokenResult.account_id,
          account_name: tokenResult.account_name,
          access_token: tokenResult.access_token,
          token_expires_at: expiresAt,
          is_active: true,
        },
        { onConflict: 'platform,account_id' }
      ).select('id, platform, account_name, account_id, is_active, token_expires_at').single()

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data, 201)
    }

    // -------------------------------------------------------------------
    // DELETE /?id=<uuid>
    // -------------------------------------------------------------------
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return jsonResponse({ error: 'id query param required' }, 400)

      const { error } = await client.from('channel_accounts').update({ is_active: false }).eq('id', id)
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ disconnected: true })
    }

    // Catch-all: return the list for any unmatched GET
    if (req.method === 'GET') {
      const { data, error } = await client
        .from('channel_accounts')
        .select('id, platform, account_name, account_id, token_expires_at, is_active, default_budget_limit, created_at')
        .order('created_at', { ascending: false })

      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse(data ?? [])
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
