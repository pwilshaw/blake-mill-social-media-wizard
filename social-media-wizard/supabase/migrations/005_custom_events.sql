-- 005_custom_events.sql
-- Custom events with product links for targeted campaigns

CREATE TABLE custom_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  location TEXT,               -- city/region e.g. "Manchester", "London", "Nationwide"
  category TEXT NOT NULL DEFAULT 'custom',  -- music, sports, fashion, seasonal, local, custom
  external_url TEXT,           -- link to event page
  linked_products UUID[] DEFAULT '{}',  -- shirt_products IDs
  product_urls TEXT[] DEFAULT '{}',     -- direct Shopify product URLs
  notes TEXT,                  -- custom campaign notes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE custom_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage custom events
CREATE POLICY "Authenticated users can manage custom events"
  ON custom_events FOR ALL
  USING (true)
  WITH CHECK (true);
