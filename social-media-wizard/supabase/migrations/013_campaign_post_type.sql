-- 013_campaign_post_type.sql
-- Carousel support: campaigns can publish as a single post or a multi-slide
-- carousel. generate-creatives branches on this to emit asset_type
-- 'image' vs 'carousel_slide' with per-ratio slide ordering.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'single'
    CHECK (post_type IN ('single', 'carousel'));

CREATE INDEX IF NOT EXISTS campaigns_post_type_idx ON campaigns (post_type);
