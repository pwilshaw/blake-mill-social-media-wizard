-- 010_design_templates.sql
-- Creative Designer: reusable visual templates + synced Shopify brand palette.

CREATE TABLE IF NOT EXISTS design_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  design_spec JSONB NOT NULL,
  palette_snapshot JSONB,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_templates_is_active_idx
  ON design_templates (is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS shop_brand (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT UNIQUE NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  background_color TEXT,
  foreground_color TEXT,
  logo_url TEXT,
  square_logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS design_template_id UUID
    REFERENCES design_templates (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS campaigns_design_template_idx
  ON campaigns (design_template_id);

-- RLS: single-owner policy consistent with 002_rls_policies.sql
ALTER TABLE design_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_brand        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_design_templates"
  ON design_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "owner_all_shop_brand"
  ON shop_brand FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- updated_at trigger for design_templates
CREATE OR REPLACE FUNCTION set_design_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS design_templates_set_updated_at ON design_templates;
CREATE TRIGGER design_templates_set_updated_at
  BEFORE UPDATE ON design_templates
  FOR EACH ROW EXECUTE FUNCTION set_design_templates_updated_at();
