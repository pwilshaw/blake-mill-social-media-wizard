// T090 — Cron: Shopify Sync (Deno Edge Function)
// Triggered on a schedule (e.g. every 6 hours via Supabase cron).
//
// 1. Calls the sync-shopify Edge Function internally.
// 2. Compares synced shopify_ids against all known products.
// 3. Marks products not returned by Shopify as out_of_stock.
// 4. Returns a sync summary.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncedProduct {
  id: string
  shopify_id: string
  name: string
  stock_status: string
}

interface SyncShopifyResponse {
  synced_count: number
  products: SyncedProduct[]
}

interface KnownProduct {
  id: string
  shopify_id: string
  stock_status: string
}

interface SyncSummary {
  synced_count: number
  marked_out_of_stock: number
  already_out_of_stock: number
  sync_errors: string[]
  completed_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse(
      { error: 'Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY' },
      500,
    )
  }

  const client = createClient(supabaseUrl, serviceRoleKey)
  const syncErrors: string[] = []
  const completedAt = new Date().toISOString()

  try {
    // -----------------------------------------------------------------------
    // 1. Call sync-shopify function internally
    // -----------------------------------------------------------------------
    const syncUrl = `${supabaseUrl}/functions/v1/sync-shopify`
    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
    })

    if (!syncResponse.ok) {
      const errText = await syncResponse.text()
      return jsonResponse(
        { error: `sync-shopify function failed (HTTP ${syncResponse.status}): ${errText}` },
        500,
      )
    }

    const syncResult = (await syncResponse.json()) as SyncShopifyResponse

    if (!syncResult.products || syncResult.products.length === 0) {
      return jsonResponse({
        synced_count: 0,
        marked_out_of_stock: 0,
        already_out_of_stock: 0,
        sync_errors: syncErrors,
        completed_at: completedAt,
      } satisfies SyncSummary)
    }

    // -----------------------------------------------------------------------
    // 2. Build set of shopify_ids returned by Shopify
    // -----------------------------------------------------------------------
    const returnedShopifyIds = new Set(syncResult.products.map((p) => p.shopify_id))

    // -----------------------------------------------------------------------
    // 3. Fetch all known products from Supabase
    // -----------------------------------------------------------------------
    const { data: allProducts, error: fetchError } = await client
      .from('shirt_products')
      .select('id, shopify_id, stock_status')

    if (fetchError) {
      return jsonResponse({ error: `Failed to fetch products: ${fetchError.message}` }, 500)
    }

    const known = (allProducts ?? []) as KnownProduct[]

    // Products not returned by Shopify — candidates for out_of_stock
    const missingProducts = known.filter((p) => !returnedShopifyIds.has(p.shopify_id))
    const alreadyOutOfStock = missingProducts.filter((p) => p.stock_status === 'out_of_stock')
    const toMarkOutOfStock = missingProducts.filter((p) => p.stock_status !== 'out_of_stock')

    // -----------------------------------------------------------------------
    // 4. Mark missing products as out_of_stock
    // -----------------------------------------------------------------------
    let markedCount = 0

    if (toMarkOutOfStock.length > 0) {
      const ids = toMarkOutOfStock.map((p) => p.id)
      const { error: updateError } = await client
        .from('shirt_products')
        .update({ stock_status: 'out_of_stock', last_synced_at: completedAt })
        .in('id', ids)

      if (updateError) {
        syncErrors.push(`Failed to mark products out_of_stock: ${updateError.message}`)
      } else {
        markedCount = toMarkOutOfStock.length
      }
    }

    return jsonResponse({
      synced_count: syncResult.synced_count,
      marked_out_of_stock: markedCount,
      already_out_of_stock: alreadyOutOfStock.length,
      sync_errors: syncErrors,
      completed_at: completedAt,
    } satisfies SyncSummary)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: `Internal server error: ${message}` }, 500)
  }
})
