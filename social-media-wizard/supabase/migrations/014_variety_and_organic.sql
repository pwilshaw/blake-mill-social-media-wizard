-- 014_variety_and_organic.sql
-- Two aligned changes:
-- 1. Multi-variant copy per platform — each content_variant now carries a
--    variant_number (1..N within a platform) and an angle_label describing
--    the editorial angle (heritage / fit / occasion / ...).
-- 2. Organic post type — campaigns can be explicitly marked as organic so the
--    wizard can skip the Budget step and the Calendar can filter.

ALTER TABLE content_variants
  ADD COLUMN IF NOT EXISTS variant_number INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS angle_label TEXT;

CREATE INDEX IF NOT EXISTS content_variants_campaign_platform_variant_idx
  ON content_variants (campaign_id, platform, variant_number);

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS is_organic BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS campaigns_is_organic_idx
  ON campaigns (is_organic)
  WHERE is_organic = true;
