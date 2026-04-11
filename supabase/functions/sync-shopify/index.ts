// T044 — Sync Shopify Products (Deno Edge Function)
// POST /functions/v1/sync-shopify
// No request body needed.
//
// Fetches all products from Shopify GraphQL Admin API using:
//   SHOPIFY_STORE_DOMAIN   (e.g. "blake-mill.myshopify.com")
//   SHOPIFY_ADMIN_API_TOKEN
//
// Maps each product to a ShirtProduct record and upserts into Supabase.
// Returns { synced_count, products } on success.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SHOPIFY_API_VERSION = '2024-10'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

function deriveStockStatus(totalQty: number): StockStatus {
  if (totalQty <= 0) return 'out_of_stock'
  if (totalQty <= 5) return 'low_stock'
  return 'in_stock'
}

interface ShopifyImage {
  url: string
}

interface ShopifyVariant {
  price: string
  inventoryQuantity: number
  inventoryItem: {
    id: string // gid://shopify/InventoryItem/xxx
  }
}

interface ShopifyProduct {
  id: string // gid://shopify/Product/xxx
  title: string
  description: string
  images: {
    edges: Array<{ node: ShopifyImage }>
  }
  variants: {
    edges: Array<{ node: ShopifyVariant }>
  }
}

interface ShopifyGraphQLResponse {
  data?: {
    products: {
      edges: Array<{ node: ShopifyProduct }>
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  }
  errors?: Array<{ message: string }>
}

interface ShirtProductUpsert {
  shopify_id: string
  shopify_inventory_item_id: string | null
  name: string
  description: string | null
  price: number
  stock_status: StockStatus
  images: string[]
  last_synced_at: string
}

// ---------------------------------------------------------------------------
// GraphQL query — paginated, 50 products per page
// ---------------------------------------------------------------------------

function buildProductsQuery(afterCursor: string | null): string {
  const afterArg = afterCursor ? `, after: "${afterCursor}"` : ''
  return `
    query {
      products(first: 50${afterArg}) {
        edges {
          node {
            id
            title
            description
            images(first: 10) {
              edges {
                node {
                  url
                }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  price
                  inventoryQuantity
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `
}

// ---------------------------------------------------------------------------
// Fetch all products with pagination
// ---------------------------------------------------------------------------

async function fetchAllShopifyProducts(
  storeDomain: string,
  adminApiToken: string,
): Promise<ShopifyProduct[]> {
  const endpoint = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`
  const allProducts: ShopifyProduct[] = []
  let cursor: string | null = null
  let hasNextPage = true

  while (hasNextPage) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminApiToken,
      },
      body: JSON.stringify({ query: buildProductsQuery(cursor) }),
    })

    if (!response.ok) {
      throw new Error(
        `Shopify GraphQL request failed: HTTP ${response.status} ${response.statusText}`,
      )
    }

    const json = (await response.json()) as ShopifyGraphQLResponse

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Shopify GraphQL errors: ${json.errors.map((e) => e.message).join('; ')}`)
    }

    const productsData = json.data?.products
    if (!productsData) {
      throw new Error('Unexpected Shopify GraphQL response shape.')
    }

    for (const edge of productsData.edges) {
      allProducts.push(edge.node)
    }

    hasNextPage = productsData.pageInfo.hasNextPage
    cursor = productsData.pageInfo.endCursor
  }

  return allProducts
}

// ---------------------------------------------------------------------------
// Map Shopify product → ShirtProduct upsert record
// ---------------------------------------------------------------------------

function mapToShirtProduct(product: ShopifyProduct): ShirtProductUpsert {
  const numericShopifyId = product.id.replace('gid://shopify/Product/', '')

  const variants = product.variants.edges.map((e) => e.node)
  const primaryVariant = variants[0] ?? null

  const price = primaryVariant ? parseFloat(primaryVariant.price) : 0
  const totalInventory = variants.reduce((sum, v) => sum + (v.inventoryQuantity ?? 0), 0)
  const stockStatus = deriveStockStatus(totalInventory)

  const images = product.images.edges.map((e) => e.node.url)

  // Store the primary variant's inventory item ID for webhook reconciliation
  const inventoryItemId = primaryVariant?.inventoryItem?.id
    ? primaryVariant.inventoryItem.id.replace('gid://shopify/InventoryItem/', '')
    : null

  return {
    shopify_id: numericShopifyId,
    shopify_inventory_item_id: inventoryItemId,
    name: product.title,
    description: product.description || null,
    price,
    stock_status: stockStatus,
    images,
    last_synced_at: new Date().toISOString(),
  }
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

  const storeDomain = Deno.env.get('SHOPIFY_STORE_DOMAIN')
  const adminApiToken = Deno.env.get('SHOPIFY_ADMIN_API_TOKEN')

  if (!storeDomain || !adminApiToken) {
    return jsonResponse(
      { error: 'SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN env vars are required.' },
      500,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client = createClient(supabaseUrl, serviceRoleKey)

  try {
    // -----------------------------------------------------------------------
    // 1. Fetch all products from Shopify
    // -----------------------------------------------------------------------
    const shopifyProducts = await fetchAllShopifyProducts(storeDomain, adminApiToken)

    if (shopifyProducts.length === 0) {
      return jsonResponse({ synced_count: 0, products: [] })
    }

    // -----------------------------------------------------------------------
    // 2. Map to ShirtProduct upsert records
    // -----------------------------------------------------------------------
    const upsertRows = shopifyProducts.map(mapToShirtProduct)

    // -----------------------------------------------------------------------
    // 3. Upsert into Supabase (batch in chunks of 50 to stay within limits)
    // -----------------------------------------------------------------------
    const CHUNK_SIZE = 50
    const upsertedProducts: unknown[] = []

    for (let i = 0; i < upsertRows.length; i += CHUNK_SIZE) {
      const chunk = upsertRows.slice(i, i + CHUNK_SIZE)

      const { data, error } = await client
        .from('shirt_products')
        .upsert(chunk, { onConflict: 'shopify_id' })
        .select('id, shopify_id, name, stock_status')

      if (error) {
        return jsonResponse({ error: error.message }, 500)
      }

      if (data) {
        upsertedProducts.push(...data)
      }
    }

    return jsonResponse({
      synced_count: upsertedProducts.length,
      products: upsertedProducts,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: `Internal server error: ${message}` }, 500)
  }
})
