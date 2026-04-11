-- 001_initial_schema.sql
-- Social Media Wizard: All tables from data-model.md

-- Enums
CREATE TYPE stock_status AS ENUM ('in_stock', 'out_of_stock', 'low_stock');
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE campaign_type AS ENUM ('manual', 'weather_triggered', 'event_triggered', 'holiday', 'scheduled');
CREATE TYPE platform AS ENUM ('facebook', 'instagram', 'linkedin', 'tiktok');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'revision_requested');
CREATE TYPE asset_type AS ENUM ('image', 'carousel_slide', 'video_thumbnail');
CREATE TYPE aspect_ratio AS ENUM ('1:1', '4:5', '16:9', '9:16');
CREATE TYPE post_status AS ENUM ('queued', 'published', 'failed', 'removed');
CREATE TYPE segment_source AS ENUM ('survey', 'klaviyo', 'manual', 'combined');
CREATE TYPE style_preference AS ENUM ('bold', 'subtle', 'mixed');
CREATE TYPE purchase_intent AS ENUM ('high', 'medium', 'low');
CREATE TYPE trigger_type AS ENUM ('weather', 'event', 'holiday', 'seasonal');
CREATE TYPE budget_scope AS ENUM ('channel', 'campaign', 'global');
CREATE TYPE budget_period AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE sentiment AS ENUM ('positive', 'neutral', 'negative', 'inappropriate');
CREATE TYPE reply_status AS ENUM ('pending_review', 'auto_sent', 'manually_sent', 'skipped', 'flagged');
CREATE TYPE simple_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- ShirtProduct
CREATE TABLE shirt_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_status stock_status NOT NULL DEFAULT 'in_stock',
  images TEXT[] NOT NULL DEFAULT '{}',
  style_boldness INTEGER CHECK (style_boldness BETWEEN 1 AND 5),
  colour_family TEXT,
  contextual_tags TEXT[] DEFAULT '{}',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ContentTemplate (for auto-publish triggers, FR-017)
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform platform NOT NULL,
  copy_template TEXT NOT NULL,
  hashtag_template TEXT[] DEFAULT '{}',
  cta_template TEXT,
  style_preset TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CustomerSegment
CREATE TABLE customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source segment_source NOT NULL DEFAULT 'manual',
  age_range TEXT,
  style_preference style_preference,
  purchase_occasions TEXT[] DEFAULT '{}',
  purchase_intent purchase_intent,
  klaviyo_segment_id TEXT,
  member_count INTEGER,
  last_synced_at TIMESTAMPTZ DEFAULT now()
);

-- ContextualTrigger
CREATE TABLE contextual_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type trigger_type NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  matched_shirts UUID[] NOT NULL DEFAULT '{}',
  content_template_id UUID REFERENCES content_templates(id),
  is_active BOOLEAN DEFAULT true,
  last_fired_at TIMESTAMPTZ,
  cooldown_hours INTEGER DEFAULT 24
);

-- ChannelAccount
CREATE TABLE channel_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform NOT NULL,
  account_name TEXT NOT NULL,
  account_id TEXT NOT NULL,
  access_token TEXT, -- stored encrypted or in Vault
  token_expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  default_budget_limit DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  campaign_type campaign_type NOT NULL DEFAULT 'manual',
  target_segments UUID[] DEFAULT '{}',
  channels UUID[] DEFAULT '{}',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  budget_limit DECIMAL(10,2),
  budget_spent DECIMAL(10,2) DEFAULT 0,
  auto_approved BOOLEAN DEFAULT false,
  trigger_rule_id UUID REFERENCES contextual_triggers(id),
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CampaignShirt (join table)
CREATE TABLE campaign_shirts (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  shirt_product_id UUID NOT NULL REFERENCES shirt_products(id),
  is_primary BOOLEAN DEFAULT false,
  PRIMARY KEY (campaign_id, shirt_product_id)
);

-- ContentVariant
CREATE TABLE content_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  platform platform NOT NULL,
  copy_text TEXT NOT NULL,
  hashtags TEXT[] DEFAULT '{}',
  call_to_action TEXT,
  approval_status approval_status DEFAULT 'pending',
  depth_score_clarity INTEGER NOT NULL CHECK (depth_score_clarity BETWEEN 1 AND 10),
  depth_score_persuasion INTEGER NOT NULL CHECK (depth_score_persuasion BETWEEN 1 AND 10),
  depth_score_actionability INTEGER NOT NULL CHECK (depth_score_actionability BETWEEN 1 AND 10),
  depth_score_accuracy INTEGER NOT NULL CHECK (depth_score_accuracy BETWEEN 1 AND 10),
  uncertain_claims JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CreativeAsset
CREATE TABLE creative_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_variant_id UUID NOT NULL REFERENCES content_variants(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  source_product_image_url TEXT NOT NULL,
  generated_image_url TEXT,
  overlay_text TEXT,
  aspect_ratio aspect_ratio NOT NULL,
  slide_order INTEGER,
  approval_status simple_approval_status DEFAULT 'pending'
);

-- ChannelPost
CREATE TABLE channel_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel_account_id UUID NOT NULL REFERENCES channel_accounts(id),
  content_variant_id UUID NOT NULL REFERENCES content_variants(id),
  platform_post_id TEXT,
  status post_status NOT NULL DEFAULT 'queued',
  published_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  engagement_count INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  error_message TEXT
);

-- BudgetRule
CREATE TABLE budget_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope budget_scope NOT NULL,
  channel_account_id UUID REFERENCES channel_accounts(id),
  campaign_id UUID REFERENCES campaigns(id),
  period budget_period NOT NULL,
  limit_amount DECIMAL(10,2) NOT NULL,
  current_spend DECIMAL(10,2) DEFAULT 0,
  alert_threshold_pct INTEGER DEFAULT 80,
  auto_pause BOOLEAN DEFAULT true,
  period_reset_at TIMESTAMPTZ NOT NULL
);

-- EngagementReply
CREATE TABLE engagement_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_post_id UUID NOT NULL REFERENCES channel_posts(id) ON DELETE CASCADE,
  platform_comment_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  comment_author TEXT NOT NULL,
  sentiment sentiment NOT NULL,
  reply_text TEXT NOT NULL,
  reply_status reply_status NOT NULL DEFAULT 'pending_review',
  product_nudge_shirt_id UUID REFERENCES shirt_products(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  replied_at TIMESTAMPTZ
);

-- PerformanceSnapshot
CREATE TABLE performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_spend DECIMAL(10,2) DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  roi DECIMAL(10,4) DEFAULT 0,
  ai_rating INTEGER CHECK (ai_rating BETWEEN 1 AND 10),
  ai_commentary TEXT
);

-- SpendLog
CREATE TABLE spend_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel_account_id UUID NOT NULL REFERENCES channel_accounts(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT
);

-- Indexes
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled_start ON campaigns(scheduled_start);
CREATE INDEX idx_content_variants_campaign ON content_variants(campaign_id);
CREATE INDEX idx_content_variants_approval ON content_variants(approval_status);
CREATE INDEX idx_creative_assets_variant ON creative_assets(content_variant_id);
CREATE INDEX idx_channel_posts_campaign ON channel_posts(campaign_id);
CREATE INDEX idx_channel_posts_status ON channel_posts(status);
CREATE INDEX idx_engagement_replies_post ON engagement_replies(channel_post_id);
CREATE INDEX idx_engagement_replies_status ON engagement_replies(reply_status);
CREATE INDEX idx_performance_snapshots_campaign ON performance_snapshots(campaign_id);
CREATE INDEX idx_spend_logs_campaign ON spend_logs(campaign_id);
CREATE INDEX idx_budget_rules_scope ON budget_rules(scope);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
