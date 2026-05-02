-- 023_channel_posts_backfill.sql
-- Allow channel_posts to be backfilled from Apify scrapes — those rows
-- weren't authored through this app, so they have no content_variant or
-- campaign. Also add a unique key for safe upsert.

ALTER TABLE channel_posts
  ALTER COLUMN content_variant_id DROP NOT NULL;

ALTER TABLE channel_posts
  ALTER COLUMN campaign_id DROP NOT NULL;

-- One platform_post_id per channel account. Apify scrapes return stable
-- post IDs we can dedupe on.
CREATE UNIQUE INDEX IF NOT EXISTS channel_posts_account_post_uidx
  ON channel_posts (channel_account_id, platform_post_id)
  WHERE platform_post_id IS NOT NULL;

-- Tag the source so we can distinguish app-published vs backfilled rows.
ALTER TABLE channel_posts
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app';

CREATE INDEX IF NOT EXISTS channel_posts_source_idx
  ON channel_posts (source);
