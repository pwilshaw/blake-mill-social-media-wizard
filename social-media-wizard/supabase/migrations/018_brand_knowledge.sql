-- 018_brand_knowledge.sql
-- Brand voice + guidelines + reference designs.
-- Centralises the brand knowledge so every Claude caller that speaks AS the
-- brand (generate-content, engagement, agent-respond) reads from one place.

ALTER TABLE shop_brand
  ADD COLUMN IF NOT EXISTS tone_of_voice TEXT,
  ADD COLUMN IF NOT EXISTS brand_guidelines TEXT,
  ADD COLUMN IF NOT EXISTS dos_donts TEXT;

CREATE TABLE IF NOT EXISTS brand_reference_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  caption TEXT,
  ordinal INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brand_reference_designs_ordinal_idx
  ON brand_reference_designs (ordinal, created_at);

ALTER TABLE brand_reference_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_brand_reference_designs"
  ON brand_reference_designs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
