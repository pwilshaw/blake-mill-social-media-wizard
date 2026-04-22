-- 012_brand_assets_bucket.sql
-- Public Storage bucket for uploaded brand logos used by Creative Templates.
-- Shopify-synced logos land in shop_brand.logo_url / square_logo_url as before;
-- this bucket holds URLs for manually uploaded logos when Shopify brand isn't set.

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Single-owner: authenticated user can read/write brand assets.
CREATE POLICY "auth can upload brand assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets');

CREATE POLICY "auth can update brand assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-assets');

CREATE POLICY "auth can delete brand assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets');

-- Public reads are automatic because bucket.public = true.
