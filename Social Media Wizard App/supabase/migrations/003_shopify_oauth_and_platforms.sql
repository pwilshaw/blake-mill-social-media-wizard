-- 003_shopify_oauth_and_platforms.sql
-- Add Shopify OAuth token storage and new platform enum values

-- Add new platforms to the platform enum
ALTER TYPE platform ADD VALUE IF NOT EXISTS 'google_ads';
ALTER TYPE platform ADD VALUE IF NOT EXISTS 'snapchat';

-- Shopify store connections (OAuth app model via Partners Dashboard)
CREATE TABLE shopify_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT UNIQUE NOT NULL,          -- e.g. "blakemill.myshopify.com"
  access_token TEXT NOT NULL,                -- OAuth access token (encrypted in Vault ideally)
  scopes TEXT NOT NULL DEFAULT '',           -- granted scopes
  is_active BOOLEAN NOT NULL DEFAULT true,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uninstalled_at TIMESTAMPTZ
);

-- Add shopify_inventory_item_id to shirt_products if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shirt_products' AND column_name = 'shopify_inventory_item_id'
  ) THEN
    ALTER TABLE shirt_products ADD COLUMN shopify_inventory_item_id TEXT;
  END IF;
END $$;

-- RLS for shopify_stores (service role only — never expose tokens to anon)
ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
-- No anon policies — only service_role can read/write
