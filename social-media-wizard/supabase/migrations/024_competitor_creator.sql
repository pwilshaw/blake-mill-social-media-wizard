-- 024_competitor_creator.sql
-- Competitor monitor + YouTube creator discovery, both backed by Apify.

-- 1. Competitor handles to scrape
CREATE TABLE IF NOT EXISTS competitor_handles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube', 'tiktok', 'facebook')),
  handle TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, handle)
);
CREATE INDEX IF NOT EXISTS competitor_handles_active_idx
  ON competitor_handles (is_active, last_scraped_at);

-- 2. Per-platform posts pulled via Apify scrapers
CREATE TABLE IF NOT EXISTS competitor_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_handle_id UUID NOT NULL REFERENCES competitor_handles(id) ON DELETE CASCADE,
  platform_post_id TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  content TEXT,
  url TEXT,
  views INT NOT NULL DEFAULT 0,
  likes INT NOT NULL DEFAULT 0,
  comments INT NOT NULL DEFAULT 0,
  engagement_rate_pct NUMERIC(6, 2),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (competitor_handle_id, platform_post_id)
);
CREATE INDEX IF NOT EXISTS competitor_posts_published_idx
  ON competitor_posts (published_at DESC);

-- 3. Shortlist of YouTube creators we might want to partner with.
-- Discovered via the /creators page (Apify YouTube search), then saved here.
CREATE TABLE IF NOT EXISTS creator_shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  channel_id TEXT,                       -- platform-native ID (UCxxx for YT)
  channel_name TEXT NOT NULL,
  channel_url TEXT,
  subscriber_count BIGINT,
  video_count INT,
  view_count BIGINT,
  country TEXT,
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'shortlisted'
    CHECK (status IN ('shortlisted', 'contacted', 'partnered', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, channel_id)
);
CREATE INDEX IF NOT EXISTS creator_shortlist_status_idx
  ON creator_shortlist (status, updated_at DESC);

-- RLS — single owner
ALTER TABLE competitor_handles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_posts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_shortlist   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_competitor_handles"
  ON competitor_handles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_competitor_posts"
  ON competitor_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_creator_shortlist"
  ON creator_shortlist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at triggers (reuse the agent helper from earlier migrations)
DROP TRIGGER IF EXISTS competitor_handles_set_updated_at ON competitor_handles;
CREATE TRIGGER competitor_handles_set_updated_at
  BEFORE UPDATE ON competitor_handles
  FOR EACH ROW EXECUTE FUNCTION set_agent_updated_at();

DROP TRIGGER IF EXISTS creator_shortlist_set_updated_at ON creator_shortlist;
CREATE TRIGGER creator_shortlist_set_updated_at
  BEFORE UPDATE ON creator_shortlist
  FOR EACH ROW EXECUTE FUNCTION set_agent_updated_at();

-- Two new agent templates that lean on these tables.
INSERT INTO agent_templates (agent_key, template_key, name, description, prompt_template, cron_expr) VALUES
('social_media', 'competitor_pulse',
 'Competitor pulse',
 'What competitors posted recently and what looks like it''s working',
 'Summarise the last 14 days of competitor posts in the data slice. Lead with one or two creative patterns repeating across competitors that we are not doing. Call out any specific post that broke through (high engagement relative to that competitor''s average). End with one specific creative move we should test.',
 NULL),
('acquisition', 'youtube_creator_collabs',
 'YouTube collab candidates',
 'Recommend top YouTube creators from the shortlist to approach for collabs',
 'Look at the shortlisted YouTube creators in the data slice. Recommend the top 3 to approach. For each: one sentence on why they fit Blake Mill (audience, vibe, content), and one sentence on a specific angle for outreach. If the shortlist is empty say so plainly and recommend a search query for /creators.',
 NULL)
ON CONFLICT (agent_key, template_key) DO NOTHING;
