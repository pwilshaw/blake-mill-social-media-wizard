// ============================================================
// Enums
// ============================================================

export type StockStatus = 'in_stock' | 'out_of_stock' | 'low_stock'

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export type CampaignType =
  | 'manual'
  | 'weather_triggered'
  | 'event_triggered'
  | 'holiday'
  | 'scheduled'

export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok'

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested'

export type AssetType = 'image' | 'carousel_slide' | 'video_thumbnail'

export type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16'

export type PostStatus = 'queued' | 'published' | 'failed' | 'removed'

export type SegmentSource = 'survey' | 'klaviyo' | 'manual' | 'combined'

export type StylePreference = 'bold' | 'subtle' | 'mixed'

export type PurchaseIntent = 'high' | 'medium' | 'low'

export type TriggerType = 'weather' | 'event' | 'holiday' | 'seasonal'

export type BudgetScope = 'channel' | 'campaign' | 'global'

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly'

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'inappropriate'

export type ReplyStatus =
  | 'pending_review'
  | 'auto_sent'
  | 'manually_sent'
  | 'skipped'
  | 'flagged'

export type SimpleApprovalStatus = 'pending' | 'approved' | 'rejected'

// ============================================================
// Entities
// ============================================================

export interface ShirtProduct {
  id: string
  shopify_id: string
  name: string
  description: string | null
  price: number
  stock_status: StockStatus
  images: string[]
  style_boldness: number | null
  colour_family: string | null
  contextual_tags: string[]
  last_synced_at: string
}

export interface CampaignShirt {
  campaign_id: string
  shirt_product_id: string
  is_primary: boolean
}

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  campaign_type: CampaignType
  target_segments: string[]
  channels: string[]
  scheduled_start: string | null
  scheduled_end: string | null
  budget_limit: number | null
  budget_spent: number
  auto_approved: boolean
  trigger_rule_id: string | null
  performance_rating: number | null
  created_at: string
  updated_at: string
  shirts?: ShirtProduct[]
}

export interface ContentVariant {
  id: string
  campaign_id: string
  platform: Platform
  copy_text: string
  hashtags: string[]
  call_to_action: string | null
  approval_status: ApprovalStatus
  depth_score_clarity: number
  depth_score_persuasion: number
  depth_score_actionability: number
  depth_score_accuracy: number
  uncertain_claims: UncertainClaim[]
  created_at: string
}

export interface UncertainClaim {
  claim: string
  explanation: string
}

export interface CreativeAsset {
  id: string
  content_variant_id: string
  asset_type: AssetType
  source_product_image_url: string
  generated_image_url: string | null
  overlay_text: string | null
  aspect_ratio: AspectRatio
  slide_order: number | null
  approval_status: SimpleApprovalStatus
}

export interface ChannelAccount {
  id: string
  platform: Platform
  account_name: string
  account_id: string
  token_expires_at: string
  is_active: boolean
  default_budget_limit: number | null
  created_at: string
}

export interface ChannelPost {
  id: string
  campaign_id: string
  channel_account_id: string
  content_variant_id: string
  platform_post_id: string | null
  status: PostStatus
  published_at: string | null
  impressions: number
  clicks: number
  engagement_count: number
  spend: number
  error_message: string | null
}

export interface CustomerSegment {
  id: string
  name: string
  source: SegmentSource
  age_range: string | null
  style_preference: StylePreference | null
  purchase_occasions: string[]
  purchase_intent: PurchaseIntent | null
  klaviyo_segment_id: string | null
  member_count: number | null
  last_synced_at: string
}

export interface ContextualTrigger {
  id: string
  name: string
  trigger_type: TriggerType
  conditions: Record<string, unknown>
  matched_shirts: string[]
  content_template_id: string | null
  is_active: boolean
  last_fired_at: string | null
  cooldown_hours: number
}

export interface ContentTemplate {
  id: string
  name: string
  platform: Platform
  copy_template: string
  hashtag_template: string[]
  cta_template: string | null
  style_preset: string | null
  is_active: boolean
  created_at: string
}

export interface BudgetRule {
  id: string
  scope: BudgetScope
  channel_account_id: string | null
  campaign_id: string | null
  period: BudgetPeriod
  limit_amount: number
  current_spend: number
  alert_threshold_pct: number
  auto_pause: boolean
  period_reset_at: string
}

export interface EngagementReply {
  id: string
  channel_post_id: string
  platform_comment_id: string
  comment_text: string
  comment_author: string
  sentiment: Sentiment
  reply_text: string
  reply_status: ReplyStatus
  product_nudge_shirt_id: string | null
  created_at: string
  replied_at: string | null
}

export interface PerformanceSnapshot {
  id: string
  campaign_id: string
  snapshot_at: string
  total_impressions: number
  total_clicks: number
  total_spend: number
  total_conversions: number
  roi: number
  ai_rating: number | null
  ai_commentary: string | null
}

export interface SpendLog {
  id: string
  campaign_id: string
  channel_account_id: string
  amount: number
  currency: string
  logged_at: string
  description: string | null
}

// ============================================================
// Dashboard / API response types
// ============================================================

export interface DashboardMetrics {
  impressions: number
  clicks: number
  spend: number
  conversions: number
  roi: number
  campaigns_active: number
  period: string
}

export interface MetricTrend {
  value: number
  previous_value: number
  change_pct: number
}
