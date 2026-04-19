-- 007_search_cache.sql
-- Cache SerpAPI results to avoid duplicate calls for weather/events

CREATE TABLE search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,  -- e.g. "weather:manchester" or "events:manchester"
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_cache_key ON search_cache (cache_key);
CREATE INDEX idx_search_cache_expires ON search_cache (expires_at);

ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;
