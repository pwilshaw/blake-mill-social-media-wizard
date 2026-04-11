// T043 — Shopify Webhook Handler (Deno Edge Function)
// POST /functions/v1/webhooks/shopify
//
// Handles Shopify webhook topics:
//   products/update       — upsert ShirtProduct record
//   inventory_levels/update — update stock_status
//
// Verifies HMAC-SHA256 signature using X-Shopify-Hmac-Sha256 header
// and the SHOPIFY_WEBHOOK_SECRET environment variable.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// HMAC verification
// ---------------------------------------------------------------------------

async function verifyShopifyHmac(
  rawBody: string,
  hmacHeader: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(rawBody)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  const computedHmac = btoa(String.fromCharCode(...new Uint8Array(signature)))

  // Constant-time comparison to avoid timing attacks
  if (computedHmac.length !== hmacHeader.length) return false
  let mismatch = 0
  for (let i = 0; i < computedHmac.length; i++) {
    mismatch |= computedHmac.charCodeAt(i) ^ hmacHeader.charCodeAt(i)
  }
  return mismatch === 0
}

// ---------------------------------------------------------------------------
// Stock status mapping
// ---------------------------------------------------------------------------

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

function deriveStockStatus(available: number): StockStatus {
  if (available <= 0) return 'out_of_stock'
  if (available <= 5) return 'low_stock'
  return 'in_stock'
}

// ---------------------------------------------------------------------------
// Shopify payload types (simplified — only fields we need)
// ---------------------------------------------------------------------------

interface ShopifyProductImage {
  src: string
}

interface ShopifyVariant {
  price: string
  inventory_quantity: number
}

interface ShopifyProductPayload {
  id: number
  title: string
  body_html: string | null
  images: ShopifyProductImage[]
  variants: ShopifyVariant[]
}

interface ShopifyInventoryPayload {
  inventory_item_id: number
  location_id: number
  available: number
  // Shopify doesn't include product_id directly in inventory webhook;
  // we resolve via inventory_items if needed, but for now we use available
  // to patch any ShirtProduct whose shopify_inventory_item_id matches.
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405)
  }

  // -------------------------------------------------------------------------
  // Read raw body first (needed for HMAC verification)
  // -------------------------------------------------------------------------
  const rawBody = await req.text()

  // -------------------------------------------------------------------------
  // Verify HMAC signature
  // -------------------------------------------------------------------------
  const webhookSecret = Deno.env.get('SHOPIFY_WEBHOOK_SECRET')
  if (!webhookSecret) {
    return jsonResponse({ error: 'Webhook secret not configured.' }, 500)
  }

  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') ?? ''
  if (!hmacHeader) {
    return jsonResponse({ error: 'Missing X-Shopify-Hmac-Sha256 header.' }, 401)
  }

  const isValid = await verifyShopifyHmac(rawBody, hmacHeader, webhookSecret)
  if (!isValid) {
    return jsonResponse({ error: 'HMAC verification failed.' }, 401)
  }

  // -------------------------------------------------------------------------
  // Identify topic
  // -------------------------------------------------------------------------
  const topic = req.headers.get('x-shopify-topic') ?? ''

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, 400)
  }

  try {
    // -----------------------------------------------------------------------
    // products/update
    // -----------------------------------------------------------------------
    if (topic === 'products/update') {
      const product = payload as ShopifyProductPayload

      const primaryVariant = product.variants?.[0]
      const price = primaryVariant ? parseFloat(primaryVariant.price) : 0
      const inventoryQty = primaryVariant?.inventory_quantity ?? 0
      const stockStatus = deriveStockStatus(inventoryQty)
      const images = (product.images ?? []).map((img) => img.src)

      const { error } = await client.from('shirt_products').upsert(
        {
          shopify_id: String(product.id),
          name: product.title,
          description: product.body_html ?? null,
          price,
          stock_status: stockStatus,
          images,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'shopify_id' },
      )

      if (error) {
        return jsonResponse({ error: error.message }, 500)
      }

      return jsonResponse({ ok: true, topic, shopify_id: String(product.id) })
    }

    // -----------------------------------------------------------------------
    // inventory_levels/update
    //
    // Shopify sends inventory_item_id (not product_id). We store
    // shopify_inventory_item_id on ShirtProduct (set during sync).
    // If that column doesn't exist yet, fall back to a no-op 200 so Shopify
    // doesn't retry indefinitely.
    // -----------------------------------------------------------------------
    if (topic === 'inventory_levels/update') {
      const inv = payload as ShopifyInventoryPayload
      const stockStatus = deriveStockStatus(inv.available ?? 0)

      const { error } = await client
        .from('shirt_products')
        .update({
          stock_status: stockStatus,
          last_synced_at: new Date().toISOString(),
        })
        .eq('shopify_inventory_item_id', String(inv.inventory_item_id))

      if (error) {
        // If column doesn't exist yet, log and return 200 so Shopify doesn't retry
        console.warn('inventory_levels/update update failed:', error.message)
      }

      return jsonResponse({ ok: true, topic, inventory_item_id: inv.inventory_item_id })
    }

    // Unknown topic — return 200 so Shopify doesn't retry
    return jsonResponse({ ok: true, topic, note: 'Topic not handled.' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: `Internal server error: ${message}` }, 500)
  }
})
