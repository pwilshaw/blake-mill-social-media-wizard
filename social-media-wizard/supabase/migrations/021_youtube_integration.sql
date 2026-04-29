-- 021_youtube_integration.sql
-- YouTube organic upload + paid Google Ads YouTube campaign support.

-- 1. Per-variant metadata holder (YouTube uses title/description/tags;
--    can carry other platform-specific fields later).
ALTER TABLE content_variants
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Track uploaded video files. One row per file, regardless of how many
--    variants reference it.
CREATE TABLE IF NOT EXISTS video_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_name TEXT,
  size_bytes BIGINT,
  duration_seconds INT,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'publishing', 'published', 'failed')),
  status_detail TEXT,
  youtube_video_id TEXT,
  youtube_channel_account_id UUID REFERENCES channel_accounts(id),
  selected_variant_id UUID REFERENCES content_variants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_uploads_campaign_idx ON video_uploads (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS video_uploads_status_idx ON video_uploads (status);

-- 3. Track Google Ads YouTube campaigns we've created so we can show their
--    status, budget, and IDs.
CREATE TABLE IF NOT EXISTS youtube_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  video_upload_id UUID REFERENCES video_uploads(id) ON DELETE CASCADE,
  google_customer_id TEXT NOT NULL,
  google_campaign_id TEXT,
  google_ad_group_id TEXT,
  google_ad_id TEXT,
  daily_budget_micros BIGINT,
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitting', 'active', 'paused', 'rejected', 'error')),
  status_detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS youtube_ad_campaigns_campaign_idx ON youtube_ad_campaigns (campaign_id);
CREATE INDEX IF NOT EXISTS youtube_ad_campaigns_video_idx ON youtube_ad_campaigns (video_upload_id);

-- 4. RLS — single owner.
ALTER TABLE video_uploads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_video_uploads"
  ON video_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_youtube_ad_campaigns"
  ON youtube_ad_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. updated_at triggers (reuse the existing helper if defined, else create).
CREATE OR REPLACE FUNCTION set_youtube_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS video_uploads_set_updated_at ON video_uploads;
CREATE TRIGGER video_uploads_set_updated_at
  BEFORE UPDATE ON video_uploads
  FOR EACH ROW EXECUTE FUNCTION set_youtube_updated_at();

DROP TRIGGER IF EXISTS youtube_ad_campaigns_set_updated_at ON youtube_ad_campaigns;
CREATE TRIGGER youtube_ad_campaigns_set_updated_at
  BEFORE UPDATE ON youtube_ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION set_youtube_updated_at();

-- 6. Storage bucket for video files. 250 MiB ceiling per file.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 262144000)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY "auth can upload videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos');
CREATE POLICY "auth can update videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'videos');
CREATE POLICY "auth can delete videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos');
