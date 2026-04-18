-- 006_search_usage.sql
-- Track SerpAPI usage for rate limiting

CREATE TABLE search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  action TEXT NOT NULL,
  api_calls INTEGER NOT NULL DEFAULT 1,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_usage_date ON search_usage (searched_at);

ALTER TABLE search_usage ENABLE ROW LEVEL SECURITY;
