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

export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'google_ads' | 'snapchat' | 'shopify'

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested'

export type AssetType = 'image' | 'carousel_slide' | 'video_thumbnail'

export type PostType = 'single' | 'carousel'

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
  design_template_id: string | null
  post_type: PostType
  is_organic: boolean
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
  variant_number: number
  angle_label: string | null
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

// ============================================================
// AI Media Buyer
// ============================================================

export type OptimizationGoal = 'roas' | 'cpa' | 'ctr' | 'conversions'

export interface MediaBuyerConfig {
  id: string
  channel_account_id: string
  optimization_goal: OptimizationGoal
  target_roas: number | null
  target_cpa: number | null
  auto_adjust_bids: boolean
  auto_expand_audiences: boolean
  auto_reallocate_budget: boolean
  is_active: boolean
  last_optimized_at: string | null
}

export interface OptimizationAction {
  id: string
  config_id: string
  action_type: 'bid_adjustment' | 'audience_expansion' | 'budget_reallocation' | 'pause_underperformer'
  description: string
  impact_estimate: string
  applied: boolean
  created_at: string
}

// ============================================================
// Conversion Tracking
// ============================================================

export type AttributionModel = 'first_touch' | 'last_touch' | 'linear' | 'time_decay'

export interface ConversionEvent {
  id: string
  campaign_id: string
  channel_account_id: string
  event_type: 'purchase' | 'add_to_cart' | 'view_product' | 'signup'
  revenue: number
  currency: string
  attribution_model: AttributionModel
  touchpoints: ConversionTouchpoint[]
  converted_at: string
}

export interface ConversionTouchpoint {
  channel: Platform
  campaign_name: string
  interaction_type: 'click' | 'view' | 'engagement'
  timestamp: string
  attribution_weight: number
}

export interface ConversionSummary {
  total_conversions: number
  total_revenue: number
  roas: number
  cpa: number
  conversion_rate: number
  by_channel: Record<Platform, { conversions: number; revenue: number; spend: number }>
}

// ============================================================
// Design Templates (Creative Designer)
// ============================================================

export type { DesignSpec, DesignLayer, BrandPalette } from './design-spec'

export interface DesignTemplate {
  id: string
  name: string
  description: string | null
  design_spec: import('./design-spec').DesignSpec
  palette_snapshot: import('./design-spec').BrandPalette | null
  thumbnail_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ShopBrand {
  id: string
  shop_domain: string
  primary_color: string | null
  secondary_color: string | null
  background_color: string | null
  foreground_color: string | null
  logo_url: string | null
  square_logo_url: string | null
  tone_of_voice: string | null
  brand_guidelines: string | null
  dos_donts: string | null
  updated_at: string
}

export interface BrandReferenceDesign {
  id: string
  url: string
  caption: string | null
  ordinal: number
  created_at: string
}

// ============================================================
// WTP Conjoint Study
// ============================================================

// Business / SaaS buyer personas (the tool being evaluated is a SaaS product)
export type BusinessPersonaKey =
  | 'dtc'
  | 'multi'
  | 'email_first'
  | 'b2b_services'
  | 'creator'
  | 'b2b_saas'
  | 'consumer_local'
  | 'fallback'

// Consumer / shopper personas (the product being evaluated is a physical good)
export type ConsumerPersonaKey =
  | 'style_conscious'
  | 'gift_buyer'
  | 'value_shopper'
  | 'occasion_shopper'
  | 'returning_customer'
  | 'fallback_shopper'

export type PersonaKey = BusinessPersonaKey | ConsumerPersonaKey

export type StudyType = 'saas' | 'physical'

export type WtpResponsesPerSet = 25 | 50 | 100

export interface WtpFeature {
  id: string
  label: string
}

export interface WtpConfig {
  study_type: StudyType
  product_name: string
  /** Optional link to a Shopify-synced shirt so we know what real product was tested. */
  shirt_product_id?: string | null
  price_points: [number, number, number]
  features: WtpFeature[]
  responses_per_set: WtpResponsesPerSet
}

export interface WtpPairOption {
  price: number
  features: Record<string, boolean>  // feature_id → included
}

export interface WtpResponse {
  pair_id: string
  option_1: WtpPairOption
  option_2: WtpPairOption
  /** Which option was shown first in the prompt — 1 or 2 */
  first_shown: 1 | 2
  claude_choice: 'option_1' | 'option_2' | 'outside' | 'parse_error'
  reason: string | null
  raw_text: string
  ms: number
}

export interface WtpByFeature {
  id: string
  label: string
  uplift_pp: number
  wtp_gbp: number | null
}

export interface WtpResults {
  n_responses: number
  n_failed: number
  purchase_rate: number
  outside_rate: number
  by_price: { price: number; purchase_rate: number }[]
  by_feature: WtpByFeature[]
  price_elasticity_pct_per_pound: number
}

export interface WtpStudy {
  id: string
  name: string
  persona_key: PersonaKey
  system_message: string
  config: WtpConfig
  responses: WtpResponse[]
  results: WtpResults | null
  status: 'draft' | 'running' | 'complete' | 'error' | 'cancelled'
  created_at: string
  updated_at: string
}

// ============================================================
// Agent Workforce (team channel)
// ============================================================

export type AgentKey = 'social_media' | 'cro' | 'acquisition'

export type TeamMessageRole = 'boss' | 'agent' | 'system'

export type TeamMessageTrigger = 'boss' | 'agent' | 'schedule' | 'manual_template'

export type TeamMessageStatus = 'pending' | 'complete' | 'error'

export interface AgentSettings {
  agent_key: AgentKey
  display_name: string
  system_prompt: string
  custom_rules: string | null
  avatar_url: string | null
  is_active: boolean
  updated_at: string
}

export interface AgentTemplate {
  id: string
  agent_key: AgentKey
  template_key: string
  name: string
  description: string | null
  prompt_template: string
  custom_rules: string | null
  cron_expr: string | null
  is_active: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface TeamMessage {
  id: string
  role: TeamMessageRole
  agent_key: AgentKey | null
  content: string
  data_attachment: Record<string, unknown> | null
  parent_id: string | null
  mentions: AgentKey[]
  template_key: string | null
  triggered_by: TeamMessageTrigger
  hop: number
  status: TeamMessageStatus
  error: string | null
  ms: number | null
  created_at: string
}

export interface AgentUsageRow {
  id: string
  used_at: string
  agent_key: AgentKey
  trigger: TeamMessageTrigger
  template_key: string | null
  ms: number | null
  estimated_cost_usd: number | null
}

// ============================================================
// Quick Launch Templates
// ============================================================

export interface QuickLaunchTemplate {
  id: string
  name: string
  description: string
  campaign_type: CampaignType
  default_channels: Platform[]
  default_budget: number | null
  default_duration_days: number
  shirt_selection_mode: 'bestsellers' | 'new_arrivals' | 'manual' | 'ai_recommended'
  content_template_id: string | null
  is_active: boolean
}
