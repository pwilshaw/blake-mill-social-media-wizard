// Blake Mill Connector — Lightweight Shopify app
// Handles OAuth install, stores access token in Supabase, redirects to wizard.

import 'dotenv/config'
import express from 'express'
import crypto from 'crypto'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3456', 10)

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!
const SCOPES = process.env.SHOPIFY_SCOPES ?? 'read_products,read_inventory,read_orders'
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const WIZARD_URL = process.env.WIZARD_URL ?? 'https://blake-mill-social-media-wizard.vercel.app'
const HOST = process.env.HOST ?? `http://localhost:${PORT}`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function verifyHmac(query: Record<string, string>): boolean {
  const hmac = query['hmac']
  if (!hmac) return false

  const message = Object.entries(query)
    .filter(([key]) => key !== 'hmac')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  const computed = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmac))
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

// In-memory nonce store (replace with Redis/DB in production)
const nonces = new Set<string>()

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Landing page — shows install form
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Blake Mill — Connect Your Store</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fafafa; color: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: #fff; border-radius: 16px; padding: 48px; max-width: 420px; width: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; }
        .logo { width: 48px; height: 48px; background: #111; color: #fff; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; margin-bottom: 24px; }
        h1 { font-size: 22px; margin-bottom: 8px; }
        p { color: #666; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
        form { display: flex; gap: 8px; }
        input { flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 10px; font-size: 14px; outline: none; }
        input:focus { border-color: #111; }
        button { padding: 10px 20px; background: #111; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
        button:hover { background: #333; }
        .hint { margin-top: 12px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">BM</div>
        <h1>Connect Your Store</h1>
        <p>Install the Blake Mill Social Media Wizard on your Shopify store to sync products, manage campaigns, and automate your social media.</p>
        <form action="/auth" method="GET">
          <input type="text" name="shop" placeholder="your-store.myshopify.com" required />
          <button type="submit">Install</button>
        </form>
        <p class="hint">Enter your .myshopify.com store URL</p>
      </div>
    </body>
    </html>
  `)
})

// Step 1: Redirect to Shopify OAuth
app.get('/auth', (req, res) => {
  let shop = (req.query['shop'] as string ?? '').trim()

  if (!shop) {
    res.status(400).send('Missing shop parameter.')
    return
  }

  // Normalize domain
  if (!shop.includes('.myshopify.com')) {
    shop = `${shop.replace(/\.myshopify\.com$/, '')}.myshopify.com`
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    res.status(400).send('Invalid shop domain.')
    return
  }

  const nonce = generateNonce()
  nonces.add(nonce)

  const redirectUri = `${HOST}/auth/callback`
  const authUrl =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${SHOPIFY_API_KEY}` +
    `&scope=${SCOPES}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${nonce}`

  res.redirect(authUrl)
})

// Step 2: OAuth callback — exchange code for token, store in Supabase
app.get('/auth/callback', async (req, res) => {
  const query = req.query as Record<string, string>
  const { shop, code, state } = query

  if (!shop || !code || !state) {
    res.status(400).send('Missing required parameters.')
    return
  }

  // Verify nonce
  if (!nonces.has(state)) {
    res.status(403).send('Invalid state parameter.')
    return
  }
  nonces.delete(state)

  // Verify HMAC
  if (!verifyHmac(query)) {
    res.status(403).send('HMAC verification failed.')
    return
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      res.status(500).send(`Token exchange failed: ${errText}`)
      return
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string
      scope: string
    }

    // Store in Supabase
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/shopify_stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        shop_domain: shop,
        access_token: tokenData.access_token,
        scopes: tokenData.scope,
        is_active: true,
        installed_at: new Date().toISOString(),
        uninstalled_at: null,
      }),
    })

    if (!upsertRes.ok) {
      const errText = await upsertRes.text()
      console.error('Supabase upsert failed:', errText)
      res.status(500).send('Failed to store connection. Please try again.')
      return
    }

    // Redirect to the wizard with success
    res.redirect(`${WIZARD_URL}/channels?shopify=connected&shop=${encodeURIComponent(shop)}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    res.status(500).send('Something went wrong. Please try again.')
  }
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'blake-mill-connector' })
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Blake Mill Connector running on ${HOST}`)
})
