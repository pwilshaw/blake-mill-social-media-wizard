-- 015_wtp_studies.sql
-- LLM Market Research (WTP Conjoint): persist study configs, raw Claude responses,
-- and computed WTP/purchase-rate results. One row per study run.

CREATE TABLE IF NOT EXISTS wtp_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  persona_key TEXT NOT NULL,
  system_message TEXT NOT NULL,
  config JSONB NOT NULL,
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'complete', 'error', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wtp_studies_updated_at_idx
  ON wtp_studies (updated_at DESC);

ALTER TABLE wtp_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_wtp_studies"
  ON wtp_studies FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION set_wtp_studies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wtp_studies_set_updated_at ON wtp_studies;
CREATE TRIGGER wtp_studies_set_updated_at
  BEFORE UPDATE ON wtp_studies
  FOR EACH ROW EXECUTE FUNCTION set_wtp_studies_updated_at();
