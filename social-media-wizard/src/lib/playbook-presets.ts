// Playbook presets — encoded from social-media-playbook.md
// These are one-click configurable rules for triggers, campaigns, budget, and AI Media Buyer.

import type { TriggerType, Platform, CampaignType } from './types'

// ============================================================
// Weather Trigger Presets
// ============================================================

export interface TriggerPreset {
  id: string
  name: string
  description: string
  trigger_type: TriggerType
  conditions: Record<string, unknown>
  campaign_action: string
  content_tone: string
  budget_modifier: number // 1.0 = no change, 1.3 = +30%
  platforms: Platform[]
  cooldown_hours: number
  auto_approve: boolean
}

export const WEATHER_TRIGGER_PRESETS: TriggerPreset[] = [
  {
    id: 'wt-summer-heat',
    name: 'Summer Heat (20°C+)',
    description: 'Sunny day, clear skies — promote summer products, increase paid spend 30%',
    trigger_type: 'weather',
    conditions: { min_temp: 20, max_cloud_cover: 30, weather: 'clear' },
    campaign_action: 'Activate summer collection campaign; increase Stories to 8/day',
    content_tone: 'Bright, outdoor, joyful',
    budget_modifier: 1.3,
    platforms: ['instagram', 'facebook', 'tiktok'],
    cooldown_hours: 24,
    auto_approve: true,
  },
  {
    id: 'wt-heatwave',
    name: 'Heatwave (28°C+)',
    description: 'Extreme heat — flash content with urgency and limited-edition framing',
    trigger_type: 'weather',
    conditions: { min_temp: 28 },
    campaign_action: 'Activate heatwave flash content; "beat the heat" messaging',
    content_tone: 'Urgent, energetic, summer peak',
    budget_modifier: 1.5,
    platforms: ['instagram', 'facebook', 'tiktok', 'snapchat'],
    cooldown_hours: 48,
    auto_approve: true,
  },
  {
    id: 'wt-rainy-day',
    name: 'Rainy Day (4hr+ rain)',
    description: 'Sustained rain forecast — promote comfort/indoor products',
    trigger_type: 'weather',
    conditions: { min_precipitation_mm: 3, min_rain_duration_hours: 4 },
    campaign_action: 'Activate rainy day content set; comfort/treat messaging',
    content_tone: 'Cosy, homey, treat yourself',
    budget_modifier: 1.0,
    platforms: ['instagram', 'facebook', 'tiktok'],
    cooldown_hours: 48,
    auto_approve: true,
  },
  {
    id: 'wt-cold-snap',
    name: 'Cold Snap (<5°C)',
    description: 'Temperature drop >10°C in 48hrs — promote warm/seasonal products',
    trigger_type: 'weather',
    conditions: { max_temp: 5, temp_drop_48h: 10 },
    campaign_action: 'Trigger cold snap campaign; warm/cosy product push',
    content_tone: 'Warm, comforting, seasonal',
    budget_modifier: 1.2,
    platforms: ['instagram', 'facebook'],
    cooldown_hours: 72,
    auto_approve: true,
  },
  {
    id: 'wt-first-snow',
    name: 'Snow Day',
    description: 'Snow probability >60% — immediate flash content + sale',
    trigger_type: 'weather',
    conditions: { snow_probability: 60 },
    campaign_action: 'Immediate "snow day" content + flash sale',
    content_tone: 'Excited, cosy, magical',
    budget_modifier: 1.3,
    platforms: ['instagram', 'facebook', 'tiktok', 'snapchat'],
    cooldown_hours: 168,
    auto_approve: false,
  },
  {
    id: 'wt-bank-holiday-sun',
    name: 'Bank Holiday + Sun',
    description: 'Bank holiday weekend with good weather — outdoor/lifestyle content surge',
    trigger_type: 'weather',
    conditions: { min_temp: 17, is_bank_holiday: true },
    campaign_action: 'BBQ/outdoor/lifestyle content; 2x Stories, 1 Reel/day for 4 days',
    content_tone: 'Relaxed, outdoor, celebratory',
    budget_modifier: 1.2,
    platforms: ['instagram', 'facebook', 'tiktok'],
    cooldown_hours: 24,
    auto_approve: true,
  },
  {
    id: 'wt-autumn-transition',
    name: 'Autumn Arrives',
    description: 'Average temp drops >5°C vs previous week in Sep/Oct — seasonal pivot',
    trigger_type: 'seasonal',
    conditions: { temp_drop_7d: 5, months: [9, 10] },
    campaign_action: 'Trigger autumn campaign pivot; push seasonal collections; update profile imagery',
    content_tone: 'Warm tones, new season energy',
    budget_modifier: 1.1,
    platforms: ['instagram', 'facebook', 'tiktok'],
    cooldown_hours: 168,
    auto_approve: false,
  },
]

// ============================================================
// Event Trigger Presets
// ============================================================

export const EVENT_TRIGGER_PRESETS: TriggerPreset[] = [
  {
    id: 'ev-music-festival',
    name: 'Music Festival (50k+)',
    description: 'Major festival detected — festival-themed content 2 weeks before',
    trigger_type: 'event',
    conditions: { event_type: 'music_festival', min_attendance: 50000 },
    campaign_action: 'Festival-themed product content; use event hashtags during peak hours (21:00–01:00)',
    content_tone: 'Festival energy, aspirational, lifestyle',
    budget_modifier: 1.2,
    platforms: ['instagram', 'tiktok'],
    cooldown_hours: 168,
    auto_approve: true,
  },
  {
    id: 'ev-sporting-final',
    name: 'Major Sporting Final',
    description: 'UK team in a major final — reactive content 48hrs before',
    trigger_type: 'event',
    conditions: { event_type: 'sports_final', region: 'UK' },
    campaign_action: 'Sports-reactive content; game day celebration messaging',
    content_tone: 'Energetic, patriotic, celebratory',
    budget_modifier: 1.2,
    platforms: ['instagram', 'facebook', 'tiktok'],
    cooldown_hours: 24,
    auto_approve: false,
  },
  {
    id: 'ev-england-win',
    name: 'England Win',
    description: 'England win detected — celebratory content + flash discount within 30min',
    trigger_type: 'event',
    conditions: { event_type: 'sports_result', team: 'England', result: 'win' },
    campaign_action: '"Victory discount" — 4 hours, 15% off; celebratory content across all platforms',
    content_tone: 'Celebratory, momentum, energy',
    budget_modifier: 1.5,
    platforms: ['instagram', 'facebook', 'tiktok', 'snapchat'],
    cooldown_hours: 12,
    auto_approve: true,
  },
  {
    id: 'ev-england-loss',
    name: 'England Loss',
    description: 'England lose — empathy content, no sales push',
    trigger_type: 'event',
    conditions: { event_type: 'sports_result', team: 'England', result: 'loss' },
    campaign_action: '"We\'ll get \'em next time" empathy content; comfort product angle if relevant; NO sales push',
    content_tone: 'Empathetic, warm, community',
    budget_modifier: 0.7,
    platforms: ['instagram', 'facebook'],
    cooldown_hours: 24,
    auto_approve: true,
  },
  {
    id: 'ev-local-event',
    name: 'Local Event (City-Level)',
    description: 'City-level event detected — geo-targeted content 3 days before',
    trigger_type: 'event',
    conditions: { event_type: 'local', lead_days: 3 },
    campaign_action: 'Geo-targeted content for relevant city/region',
    content_tone: 'Local, community, relevant',
    budget_modifier: 1.1,
    platforms: ['instagram', 'facebook'],
    cooldown_hours: 72,
    auto_approve: true,
  },
]

// ============================================================
// Shopify Data Trigger Presets
// ============================================================

export const SHOPIFY_TRIGGER_PRESETS: TriggerPreset[] = [
  {
    id: 'sh-low-stock',
    name: 'Low Stock Alert (<20 units)',
    description: 'Product inventory drops below 20 — urgency posts across Stories',
    trigger_type: 'event',
    conditions: { shopify_signal: 'inventory_low', threshold: 20 },
    campaign_action: '"Low stock" urgency posts on Instagram + Facebook Stories',
    content_tone: 'Urgent, scarce, FOMO',
    budget_modifier: 1.3,
    platforms: ['instagram', 'facebook'],
    cooldown_hours: 24,
    auto_approve: true,
  },
  {
    id: 'sh-new-product',
    name: 'New Product Published',
    description: 'Product goes live on Shopify — auto-launch campaign across all platforms',
    trigger_type: 'event',
    conditions: { shopify_signal: 'product_published' },
    campaign_action: 'Auto-launch 7-day product launch campaign across all platforms',
    content_tone: 'Exciting, exclusive, aspirational',
    budget_modifier: 2.5,
    platforms: ['instagram', 'facebook', 'tiktok', 'google_ads', 'snapchat'],
    cooldown_hours: 1,
    auto_approve: false,
  },
  {
    id: 'sh-sales-spike',
    name: 'Sales Spike (2x Hourly Average)',
    description: 'Orders exceed 2x baseline — boost spend + social proof content',
    trigger_type: 'event',
    conditions: { shopify_signal: 'sales_spike', multiplier: 2 },
    campaign_action: 'Boost paid spend; "people are buying" social proof content',
    content_tone: 'Momentum, social proof, urgency',
    budget_modifier: 1.5,
    platforms: ['instagram', 'facebook', 'tiktok'],
    cooldown_hours: 6,
    auto_approve: true,
  },
  {
    id: 'sh-cart-abandonment-spike',
    name: 'Cart Abandonment Spike (>70%)',
    description: 'Abandonment rate exceeds 70% in 6hrs — retargeting campaign with discount',
    trigger_type: 'event',
    conditions: { shopify_signal: 'cart_abandonment_spike', threshold_pct: 70, window_hours: 6 },
    campaign_action: 'Retargeting campaign with discount; Dynamic Ads showing exact abandoned products',
    content_tone: 'Helpful, reminder, incentive',
    budget_modifier: 1.4,
    platforms: ['facebook', 'instagram', 'snapchat', 'google_ads'],
    cooldown_hours: 12,
    auto_approve: true,
  },
  {
    id: 'sh-bestseller',
    name: 'Bestseller Detected (Top 5%)',
    description: 'Product enters top 5% by sales velocity — feature in paid campaigns',
    trigger_type: 'event',
    conditions: { shopify_signal: 'bestseller', percentile: 5 },
    campaign_action: 'Feature with "Best Seller" badge in paid campaigns; highlight across all platforms',
    content_tone: 'Popular, validated, social proof',
    budget_modifier: 1.3,
    platforms: ['instagram', 'facebook', 'google_ads'],
    cooldown_hours: 168,
    auto_approve: true,
  },
]

// ============================================================
// Campaign Template Presets
// ============================================================

export interface CampaignTemplatePreset {
  id: string
  name: string
  description: string
  goal: string
  campaign_type: CampaignType
  platforms: Platform[]
  duration_days: number
  budget_multiplier: number
  content_tone: string
  schedule: { day: string; action: string }[]
  cta: string
}

export const CAMPAIGN_TEMPLATE_PRESETS: CampaignTemplatePreset[] = [
  {
    id: 'ct-product-launch',
    name: 'Product Launch (7-Day)',
    description: 'Maximum awareness + first-day sales velocity',
    goal: 'Launch new product with coordinated multi-platform campaign',
    campaign_type: 'scheduled',
    platforms: ['instagram', 'facebook', 'tiktok', 'google_ads', 'snapchat', 'linkedin'],
    duration_days: 7,
    budget_multiplier: 2.5,
    content_tone: 'Excited, exclusive, aspirational',
    schedule: [
      { day: 'Day -2', action: 'Teaser Stories (Instagram + Snapchat)' },
      { day: 'Day -1', action: 'TikTok teaser + Facebook "tomorrow" post' },
      { day: 'Day 0, 09:00', action: 'Simultaneous launch — Reel + Carousel + TikTok + FB Post + Google Shopping live' },
      { day: 'Day 1–3', action: 'Social proof content + UGC requests' },
      { day: 'Day 4–7', action: 'Urgency + bundle offers' },
    ],
    cta: 'Shop now — limited launch stock',
  },
  {
    id: 'ct-seasonal-event',
    name: 'Seasonal Event (21-Day)',
    description: "Gift purchase intent + emotional resonance (Valentine's, Mother's Day, etc.)",
    goal: 'Drive gift purchases around a seasonal moment',
    campaign_type: 'scheduled',
    platforms: ['instagram', 'facebook', 'google_ads', 'tiktok'],
    duration_days: 21,
    budget_multiplier: 2.0,
    content_tone: 'Warm, emotional, gifting-focused',
    schedule: [
      { day: 'Week 1', action: 'Inspiration content — "the perfect gift for..."' },
      { day: 'Week 2', action: 'Product showcase + social proof; email capture for last-minute reminder' },
      { day: 'Week 3', action: 'Urgency — "last order dates for delivery"; deadline content' },
      { day: 'Event day', action: '"Happy [occasion]" brand content; no hard sell' },
      { day: 'Day +1', action: '"Missed it?" — post-event offer for latecomers' },
    ],
    cta: 'Progressive: Discover → Shop now → Last chance',
  },
  {
    id: 'ct-flash-sale',
    name: 'Flash Sale (6-Hour)',
    description: 'Maximum conversions in minimum time — 15-25% discount',
    goal: 'Capture fence-sitters with time-limited urgency',
    campaign_type: 'manual',
    platforms: ['instagram', 'facebook', 'tiktok'],
    duration_days: 0.25,
    budget_multiplier: 3.0,
    content_tone: 'Urgent, exciting, time-pressured',
    schedule: [
      { day: 'T-2hr', action: 'TikTok teaser + Instagram Story countdown' },
      { day: 'T-0', action: 'All-platform announcement; link active' },
      { day: 'T+2hr', action: '"Halfway through" update; stock counter if available' },
      { day: 'T-1hr', action: 'Final hour countdown; Stories urgency' },
      { day: 'T+0 (end)', action: '"Closed" post with FOMO hook for next time' },
    ],
    cta: 'Shop now — ends at [TIME]',
  },
  {
    id: 'ct-reactive-trending',
    name: 'Reactive / Trending (24-48hr)',
    description: 'Ride cultural momentum with trend-reactive content',
    goal: 'Reach + awareness via trending moment',
    campaign_type: 'manual',
    platforms: ['tiktok', 'instagram'],
    duration_days: 2,
    budget_multiplier: 1.0,
    content_tone: "Matches the trend's energy — humour, surprise, or emotion",
    schedule: [
      { day: 'Hour 0', action: 'Identify trend; AI generates brand-safe angle within 30min' },
      { day: 'Hour 1', action: 'Human approves (or use pre-approved template rule)' },
      { day: 'Hour 1–2', action: 'Post immediately; engage heavily in comments for first 2 hours' },
      { day: 'Hour 6', action: 'Boost with £10-30 if organically performing' },
      { day: 'Hour 24–48', action: 'Wind down; move on to next trend' },
    ],
    cta: 'Soft — "follow for more" or "link in bio"',
  },
  {
    id: 'ct-weather-reactive',
    name: 'Weather-Reactive (Auto)',
    description: 'Automated campaign fired by weather triggers',
    goal: 'Hyper-relevant engagement; product-weather fit conversion',
    campaign_type: 'weather_triggered',
    platforms: ['instagram', 'facebook', 'tiktok'],
    duration_days: 0,
    budget_multiplier: 1.3,
    content_tone: 'Reactive, casual, right-place-right-time',
    schedule: [
      { day: 'Trigger', action: 'WeatherAPI fires trigger; AI generates content' },
      { day: '+15min', action: 'Content posted to Stories + feed' },
      { day: 'Duration', action: 'Active for duration of weather event + 24 hours' },
    ],
    cta: 'Shop now — perfect for today',
  },
  {
    id: 'ct-black-friday',
    name: 'Black Friday Week',
    description: 'The single highest-leverage campaign of the year',
    goal: 'Maximum revenue in peak sales period',
    campaign_type: 'scheduled',
    platforms: ['instagram', 'facebook', 'tiktok', 'google_ads', 'snapchat', 'linkedin'],
    duration_days: 10,
    budget_multiplier: 3.0,
    content_tone: 'Urgent, exclusive, once-a-year energy',
    schedule: [
      { day: '4 weeks before', action: '"Something big is coming" teaser; build VIP list' },
      { day: '2 weeks before', action: 'VIP early access tier announcement' },
      { day: '1 week before', action: 'Preview deals without revealing; countdown Stories' },
      { day: '48 hours before', action: 'Final VIP push; warm retargeting audiences' },
      { day: 'Day before', action: 'VIP early access links; Stories countdown' },
      { day: 'Black Friday 00:01', action: 'Launch everywhere; max paid spend; Stories every 2-3hrs' },
      { day: 'Saturday–Sunday', action: '"Extended weekend" messaging' },
      { day: 'Cyber Monday', action: 'Distinct "final deals" or different products/bundles' },
    ],
    cta: 'Progressive: Teaser → Early access → Shop now → Last chance',
  },
]

// ============================================================
// AI Media Buyer Rule Presets
// ============================================================

export interface MediaBuyerRulePreset {
  id: string
  name: string
  description: string
  category: 'scaling' | 'pause' | 'bid_adjustment' | 'creative_refresh' | 'audience'
  condition: string
  action: string
  auto_apply: boolean
}

export const MEDIA_BUYER_RULE_PRESETS: MediaBuyerRulePreset[] = [
  // Scaling rules
  {
    id: 'mb-scale-roas4',
    name: 'Scale at ROAS > 4.0',
    description: 'Increase budget 25% when ROAS exceeds 4.0 for 48 consecutive hours',
    category: 'scaling',
    condition: 'ROAS > 4.0 for 48 consecutive hours',
    action: 'Increase budget by 25% (max 2x in 7 days)',
    auto_apply: true,
  },
  {
    id: 'mb-scale-roas6',
    name: 'Aggressive Scale at ROAS > 6.0',
    description: 'Increase budget 40% at exceptional performance — flags for review',
    category: 'scaling',
    condition: 'ROAS > 6.0 for 24 consecutive hours',
    action: 'Increase budget by 40%; flag for human review',
    auto_apply: false,
  },
  {
    id: 'mb-scale-ctr',
    name: 'Scale High CTR + Low CPC',
    description: 'Clone winning ad sets when CTR is strong and cost is low',
    category: 'scaling',
    condition: 'CTR > 2.5% AND CPC < £0.50',
    action: 'Increase budget 20%; clone ad set with variation',
    auto_apply: true,
  },
  // Pause rules
  {
    id: 'mb-pause-low-roas',
    name: 'Pause Low ROAS',
    description: 'Stop wasting spend on underperforming campaigns',
    category: 'pause',
    condition: 'ROAS < 1.0 for 48 hours AND spend > £20',
    action: 'Pause campaign; alert for review',
    auto_apply: true,
  },
  {
    id: 'mb-pause-high-cpm',
    name: 'Pause High CPM + Low CTR',
    description: 'Creative is not resonating — pause and refresh',
    category: 'pause',
    condition: 'CPM > £30 AND CTR < 0.7%',
    action: 'Pause; refresh creative',
    auto_apply: true,
  },
  {
    id: 'mb-pause-frequency',
    name: 'Pause Ad Fatigue',
    description: 'Audience seeing the same ad too many times',
    category: 'pause',
    condition: 'Frequency > 4.0 in 7 days',
    action: 'Rotate creative; pause original ad set',
    auto_apply: true,
  },
  // Bid adjustments
  {
    id: 'mb-bid-peak-hours',
    name: 'Peak Hours Bid Boost',
    description: '+25% bids during high purchase-intent hours',
    category: 'bid_adjustment',
    condition: 'Time of day: 07:00–09:00, 12:00–13:00, 19:00–21:00',
    action: '+25% bid modifier',
    auto_apply: true,
  },
  {
    id: 'mb-bid-weekends',
    name: 'Weekend Bid Boost',
    description: '+15% bids on Friday and Saturday for purchase-intent campaigns',
    category: 'bid_adjustment',
    condition: 'Day of week = Friday OR Saturday',
    action: '+15% bid modifier for purchase-intent campaigns',
    auto_apply: true,
  },
  {
    id: 'mb-bid-weather',
    name: 'Weather Event Bid Boost',
    description: '+30% bids when weather triggers are active',
    category: 'bid_adjustment',
    condition: 'Weather trigger active (heatwave/snow)',
    action: '+30% bid modifier for relevant product campaigns',
    auto_apply: true,
  },
  // Creative refresh
  {
    id: 'mb-creative-fatigue',
    name: 'Creative Fatigue Detection',
    description: 'Flag ads seen too many times for replacement',
    category: 'creative_refresh',
    condition: 'Ad frequency > 3.5 in any 7-day period',
    action: 'Flag creative for replacement; queue AI-generated alternative',
    auto_apply: true,
  },
  {
    id: 'mb-creative-decline',
    name: 'CTR Decline Alert',
    description: 'Creative losing effectiveness — auto-generate alternatives',
    category: 'creative_refresh',
    condition: 'CTR decreases by > 30% week-over-week',
    action: 'Pause creative; auto-generate 3 alternatives with varied hooks',
    auto_apply: false,
  },
  {
    id: 'mb-creative-winner',
    name: 'Scale Winning Creative',
    description: 'New variant beating control — scale it and iterate',
    category: 'creative_refresh',
    condition: 'New creative variant outperforms control by > 20% CTR',
    action: 'Pause control; scale winner; generate 3 variations of the winner',
    auto_apply: true,
  },
  // Audience optimization
  {
    id: 'mb-audience-expand',
    name: 'Expand Winning Lookalike',
    description: 'Widen lookalike audience when current one is performing well',
    category: 'audience',
    condition: 'Lookalike audience ROAS > 3.0 for 7 days',
    action: 'Expand to 2% lookalike and test at 30% of original budget',
    auto_apply: false,
  },
  {
    id: 'mb-audience-broad-vs-interest',
    name: 'Broad vs Interest Targeting',
    description: 'Shift budget to broad targeting when it outperforms interest targeting',
    category: 'audience',
    condition: 'Interest targeting ROAS < 1.5 AND Broad targeting ROAS > 2.5',
    action: 'Shift 50% of interest budget to broad targeting',
    auto_apply: true,
  },
]

// ============================================================
// Budget Presets
// ============================================================

export interface BudgetAllocationPreset {
  id: string
  name: string
  description: string
  allocations: { platform: Platform; pct: number; focus: string }[]
}

export const BUDGET_ALLOCATION_PRESETS: BudgetAllocationPreset[] = [
  {
    id: 'ba-growth',
    name: 'Growth Phase (Recommended)',
    description: 'Balanced allocation for brand building + sales — best for first 6 months',
    allocations: [
      { platform: 'facebook', pct: 25, focus: 'Acquisition + retargeting' },
      { platform: 'instagram', pct: 20, focus: 'Brand building + shopping' },
      { platform: 'google_ads', pct: 30, focus: 'Intent capture (Shopping + PMax)' },
      { platform: 'tiktok', pct: 15, focus: 'Awareness + Gen Z acquisition' },
      { platform: 'snapchat', pct: 10, focus: 'Secondary awareness' },
    ],
  },
  {
    id: 'ba-performance',
    name: 'Performance / ROAS Focus',
    description: 'Heavy on intent capture — best when optimising for return on spend',
    allocations: [
      { platform: 'google_ads', pct: 45, focus: 'Shopping + PMax + Search' },
      { platform: 'facebook', pct: 25, focus: 'Retargeting + Advantage+ Shopping' },
      { platform: 'instagram', pct: 15, focus: 'Shopping tags + retargeting' },
      { platform: 'tiktok', pct: 10, focus: 'TikTok Shop + Spark Ads' },
      { platform: 'snapchat', pct: 5, focus: 'Dynamic Product Ads only' },
    ],
  },
  {
    id: 'ba-awareness',
    name: 'Awareness / Launch Phase',
    description: 'Maximise reach and brand visibility — best for new brand or product launch',
    allocations: [
      { platform: 'tiktok', pct: 30, focus: 'Viral reach + Spark Ads' },
      { platform: 'instagram', pct: 30, focus: 'Reels + Stories + Collabs' },
      { platform: 'facebook', pct: 20, focus: 'Video views + community' },
      { platform: 'snapchat', pct: 10, focus: 'Story Ads + AR Lenses' },
      { platform: 'google_ads', pct: 10, focus: 'YouTube pre-roll only' },
    ],
  },
]

export interface BudgetEventMultiplier {
  id: string
  name: string
  multiplier: number
  description: string
}

export const BUDGET_EVENT_MULTIPLIERS: BudgetEventMultiplier[] = [
  { id: 'bem-black-friday', name: 'Black Friday Week', multiplier: 3.0, description: '3x normal daily budget; all pause rules suspended; human review for pauses' },
  { id: 'bem-product-launch', name: 'Product Launch Day', multiplier: 2.0, description: '2x budget; prioritise Instagram + TikTok; run for 72 hours' },
  { id: 'bem-flash-sale', name: 'Flash Sale Active', multiplier: 2.5, description: '2.5x budget for sale duration; aggressive retargeting on all platforms' },
  { id: 'bem-seasonal-peak', name: 'Seasonal Event (Final Week)', multiplier: 2.0, description: '2x in final 7 days before event (Valentines, Mothers Day, etc.)' },
  { id: 'bem-weather-event', name: 'Weather Trigger Active', multiplier: 1.3, description: '+30% spend while weather trigger is firing' },
]

// ============================================================
// Posting Schedule Presets
// ============================================================

export interface PostingSchedulePreset {
  platform: Platform
  weekly_target: string
  best_times: { day: string; times: string[] }[]
  notes: string
}

export const POSTING_SCHEDULE_PRESETS: PostingSchedulePreset[] = [
  {
    platform: 'instagram',
    weekly_target: '4-5 Reels, 2-3 carousels, 5-7 Stories/day, 1 grid post',
    best_times: [
      { day: 'Monday', times: ['07:00', '12:00', '19:00'] },
      { day: 'Tuesday', times: ['08:00', '11:00', '20:00'] },
      { day: 'Wednesday', times: ['09:00', '13:00', '19:30'] },
      { day: 'Thursday', times: ['07:00', '12:00', '19:00'] },
      { day: 'Friday', times: ['09:00', '14:00', '18:00'] },
      { day: 'Saturday', times: ['10:00', '13:00'] },
      { day: 'Sunday', times: ['11:00', '20:00'] },
    ],
    notes: 'Reels peak: Tue–Fri 10:00–11:00 and 19:00–21:00. Stories: 08:00, 13:00, 20:00 daily.',
  },
  {
    platform: 'tiktok',
    weekly_target: '7-14 videos (daily posting). Mix: 60% entertainment, 30% product, 10% educational',
    best_times: [
      { day: 'Mon–Fri', times: ['06:00–09:00', '12:00–14:00', '19:00–23:00'] },
      { day: 'Saturday', times: ['10:00–13:00', '15:00–17:00', '20:00–23:00'] },
      { day: 'Sunday', times: ['09:00–12:00', '20:00–23:00'] },
    ],
    notes: 'Post 2-3x on Tuesday and Thursday (highest UK engagement days).',
  },
  {
    platform: 'facebook',
    weekly_target: '3-4 link posts (boosted), 2-3 video posts, 1-2 long-form, daily Stories',
    best_times: [
      { day: 'Tue–Thu', times: ['10:00–13:00', '15:00–17:00'] },
      { day: 'Friday', times: ['10:00', '14:00'] },
      { day: 'Sat–Sun', times: ['12:00–14:00'] },
    ],
    notes: 'Avoid Monday mornings and Sunday evenings. Boost posts that hit 500+ reach in 3hrs.',
  },
  {
    platform: 'snapchat',
    weekly_target: '3-5 Stories, 1-2 paid Snap Ads',
    best_times: [
      { day: 'Mon–Fri', times: ['19:00–22:00'] },
      { day: 'Sat–Sun', times: ['10:00–14:00'] },
    ],
    notes: 'Primarily evening/weekend platform for this demographic.',
  },
  {
    platform: 'linkedin',
    weekly_target: '3-4 posts, 1 article per fortnight',
    best_times: [
      { day: 'Tue–Thu', times: ['08:00–09:00', '17:00–18:00'] },
      { day: 'Tuesday', times: ['12:00–13:00'] },
    ],
    notes: 'Never post weekends. Founder-voice content dramatically outperforms brand content.',
  },
  {
    platform: 'google_ads',
    weekly_target: '24/7 with dayparting bid adjustments',
    best_times: [
      { day: 'Peak hours', times: ['+30% bid: 07:00–09:00, 12:00–13:00, 19:00–21:00'] },
      { day: 'Off-peak', times: ['-20% bid: 00:00–05:00'] },
      { day: 'Weekends', times: ['+10-20% bid for fashion/lifestyle/gifting'] },
    ],
    notes: 'Run 24/7. Use dayparting bid modifiers rather than scheduling.',
  },
]

// ============================================================
// Annual Calendar Presets
// ============================================================

export interface CalendarEvent {
  id: string
  name: string
  date_range: string
  lead_weeks: number
  campaign_angle: string
  quarter: 1 | 2 | 3 | 4
}

export const ANNUAL_CALENDAR: CalendarEvent[] = [
  // Q1
  { id: 'ac-new-year', name: 'New Year, New You', date_range: '1–14 Jan', lead_weeks: 0, campaign_angle: 'Aspirational, resolutions', quarter: 1 },
  { id: 'ac-blue-monday', name: 'Blue Monday', date_range: '3rd Monday of Jan', lead_weeks: 1, campaign_angle: 'Comfort, treats, self-care', quarter: 1 },
  { id: 'ac-valentines', name: "Valentine's Day", date_range: '14 Feb', lead_weeks: 3, campaign_angle: 'Gifting, couples, self-love', quarter: 1 },
  { id: 'ac-mothers-day', name: "Mother's Day (UK)", date_range: '4th Sunday of Lent', lead_weeks: 4, campaign_angle: 'Gifting, appreciation', quarter: 1 },
  { id: 'ac-spring', name: 'Spring Equinox', date_range: 'Late March', lead_weeks: 1, campaign_angle: 'New beginnings, seasonal refresh', quarter: 1 },
  // Q2
  { id: 'ac-easter', name: 'Easter Weekend', date_range: 'Varies', lead_weeks: 3, campaign_angle: 'Gift-led, 4-day weekend, spring themes', quarter: 2 },
  { id: 'ac-may-bank1', name: 'May Bank Holiday (Early)', date_range: 'First Mon of May', lead_weeks: 1, campaign_angle: 'Long weekend, outdoor/BBQ angle', quarter: 2 },
  { id: 'ac-may-bank2', name: 'May Bank Holiday (Late)', date_range: 'Last Mon of May', lead_weeks: 1, campaign_angle: 'Long weekend, outdoor/BBQ angle', quarter: 2 },
  { id: 'ac-fathers-day', name: "Father's Day", date_range: '3rd Sunday of June', lead_weeks: 4, campaign_angle: 'Gifting, appreciation', quarter: 2 },
  { id: 'ac-pride', name: 'Pride Month', date_range: 'June', lead_weeks: 4, campaign_angle: 'Authentic inclusivity', quarter: 2 },
  { id: 'ac-glastonbury', name: 'Glastonbury', date_range: 'Late June', lead_weeks: 2, campaign_angle: 'Festival fashion, sustainability, music culture', quarter: 2 },
  // Q3
  { id: 'ac-summer-peak', name: 'Peak Summer', date_range: 'Jul–Aug', lead_weeks: 0, campaign_angle: 'Holiday prep, heatwave triggers active', quarter: 3 },
  { id: 'ac-august-bank', name: 'August Bank Holiday', date_range: 'Last Mon of Aug', lead_weeks: 2, campaign_angle: 'Last long weekend of summer', quarter: 3 },
  { id: 'ac-autumn-pivot', name: 'Autumn Pivot', date_range: 'September', lead_weeks: 2, campaign_angle: 'New season, product refresh', quarter: 3 },
  // Q4
  { id: 'ac-halloween', name: 'Halloween', date_range: '31 Oct', lead_weeks: 3, campaign_angle: 'Themed content (if relevant)', quarter: 4 },
  { id: 'ac-christmas-start', name: 'Christmas Campaign Starts', date_range: '1 Nov', lead_weeks: 0, campaign_angle: 'Begin gift messaging, festive content', quarter: 4 },
  { id: 'ac-black-friday', name: 'Black Friday Week', date_range: 'Last Fri of Nov', lead_weeks: 6, campaign_angle: 'Biggest sales event of the year', quarter: 4 },
  { id: 'ac-cyber-monday', name: 'Cyber Monday', date_range: 'Mon after BF', lead_weeks: 1, campaign_angle: 'Extended or distinct "final deals"', quarter: 4 },
  { id: 'ac-gifts-under', name: '"Gifts Under £X" Series', date_range: '1–15 Dec', lead_weeks: 0, campaign_angle: 'Gift guides, last postage dates', quarter: 4 },
  { id: 'ac-last-delivery', name: 'Last Christmas Delivery', date_range: '15–22 Dec', lead_weeks: 0, campaign_angle: '"Last chance for Christmas delivery" urgency', quarter: 4 },
  { id: 'ac-boxing-day', name: 'Boxing Day Sale', date_range: '26 Dec', lead_weeks: 4, campaign_angle: 'Major sale — launch immediately', quarter: 4 },
  { id: 'ac-new-year-eve', name: 'New Year Pivot', date_range: '27–31 Dec', lead_weeks: 0, campaign_angle: '2027 aspirations, fresh start', quarter: 4 },
]
