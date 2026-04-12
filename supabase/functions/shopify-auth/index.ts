// Shopify App OAuth — Install & Callback (Partners Dashboard app)
//
// GET  /functions/v1/shopify-auth?shop=blakemill.myshopify.com
//   → Redirects to Shopify OAuth consent screen
//
// GET  /functions/v1/shopify-auth?shop=...&code=...&hmac=...&state=...
//   → Exchanges code for access token, stores in shopify_stores table
//
// Env vars required:
//   SHOPIFY_API_KEY       — App API key from Partners Dashboard
//   SHOPIFY_API_SECRET    — App API secret
//   SHOPIFY_SCOPES        — e.g. "read_products,read_inventory,read_orders"
//   SHOPIFY_APP_URL       — e.g. "https://blake-mill-social-media-wizard.vercel.app"
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

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

function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  })
}

// HMAC verification using Web Crypto API
async function verifyHmac(
  query: Record<string, string>,
  secret: string,
): Promise<boolean> {
  const hmac = query['hmac']
  if (!hmac) return false

  // Build the message from all query params except hmac, sorted alphabetically
  const entries = Object.entries(query)
    .filter(([key]) => key !== 'hmac')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(entries))
  const computed = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === hmac
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed. Use GET.' }, 405)
  }

  const apiKey = Deno.env.get('SHOPIFY_API_KEY')
  const apiSecret = Deno.env.get('SHOPIFY_API_SECRET')
  const scopes = Deno.env.get('SHOPIFY_SCOPES') ?? 'read_products,read_inventory'
  const appUrl = Deno.env.get('SHOPIFY_APP_URL') ?? ''
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!apiKey || !apiSecret) {
    return jsonResponse(
      { error: 'SHOPIFY_API_KEY and SHOPIFY_API_SECRET env vars are required.' },
      500,
    )
  }

  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams.entries())
  const shop = params['shop']

  if (!shop) {
    return jsonResponse({ error: 'Missing required "shop" parameter.' }, 400)
  }

  // Validate shop format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    return jsonResponse({ error: 'Invalid shop domain format.' }, 400)
  }

  const code = params['code']

  // -----------------------------------------------------------------------
  // Step 1: No code → redirect to Shopify OAuth consent screen
  // -----------------------------------------------------------------------
  if (!code) {
    const nonce = crypto.randomUUID()
    const callbackUrl = `${supabaseUrl}/functions/v1/shopify-auth`

    const authUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${apiKey}` +
      `&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&state=${nonce}`

    return redirect(authUrl)
  }

  // -----------------------------------------------------------------------
  // Step 2: Code present → verify HMAC + exchange for access token
  // -----------------------------------------------------------------------
  const hmacValid = await verifyHmac(params, apiSecret)
  if (!hmacValid) {
    return jsonResponse({ error: 'HMAC verification failed.' }, 403)
  }

  // Exchange authorization code for permanent access token
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }),
  })

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text()
    return jsonResponse(
      { error: `Token exchange failed: ${errText}` },
      tokenResponse.status,
    )
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string
    scope: string
  }

  // Store in Supabase
  const client = createClient(supabaseUrl, serviceRoleKey)

  const { error: upsertError } = await client.from('shopify_stores').upsert(
    {
      shop_domain: shop,
      access_token: tokenData.access_token,
      scopes: tokenData.scope,
      is_active: true,
      installed_at: new Date().toISOString(),
      uninstalled_at: null,
    },
    { onConflict: 'shop_domain' },
  )

  if (upsertError) {
    return jsonResponse({ error: `Failed to store token: ${upsertError.message}` }, 500)
  }

  // Redirect to the app after successful install
  if (appUrl) {
    return redirect(`${appUrl}/channels?shopify=connected&shop=${shop}`)
  }

  return jsonResponse({
    success: true,
    shop,
    scopes: tokenData.scope,
  })
})
