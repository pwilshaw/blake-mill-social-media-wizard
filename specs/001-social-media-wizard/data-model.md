# Data Model: Social Media Wizard

**Feature**: 001-social-media-wizard  
**Date**: 2026-04-11

## Entity Relationship Overview

```
ShirtProduct (synced from Shopify)
  ├── contextual_tags[] → weather, event, cultural mappings (array field)
  ├── has many → ContentVariant (via Campaign)
  └── has many → Campaign (via CampaignShirt join)

Campaign
  ├── has many → ContentVariant
  ├── has many → ShirtProduct (via CampaignShirt join)
  ├── belongs to → CustomerSegment (target audience)
  ├── has many → ChannelPost (one per channel)
  ├── has one → BudgetRule
  └── has many → PerformanceSnapshot (periodic metrics)

ContentVariant
  ├── belongs to → Campaign
  ├── has many → CreativeAsset (images/carousels)
  └── has one → DEPTHScore

ChannelAccount
  ├── has many → ChannelPost
  └── has many → EngagementReply

ChannelPost
  ├── belongs to → Campaign
  ├── belongs to → ChannelAccount
  ├── uses → ContentVariant
  └── has many → EngagementReply

CustomerSegment
  ├── has many → Campaign
  └── derived from → SurveyResponse + KlaviyoSync

ContextualTrigger
  ├── maps to → ShirtProduct (which shirts to promote)
  └── creates → Campaign (when triggered)
```

## Entities

### ShirtProduct

Synced from Shopify. Read-only locally (Shopify is source of truth).

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Internal ID | Primary key |
| shopify_id | Shopify product ID | Unique, not null |
| name | Product title | Not null |
| description | Product description | — |
| price | Current price | Decimal, not null |
| stock_status | in_stock, out_of_stock, low_stock | Enum, not null |
| images | Array of image URLs from Shopify | Not null, at least 1 |
| style_boldness | Scale 1-5 (subtle to bold) | Owner-assigned |
| colour_family | Primary colour category | Owner-assigned |
| contextual_tags | Cultural/thematic associations | Owner-assigned |
| last_synced_at | Last Shopify sync timestamp | Not null |

**State transitions**: stock_status changes based on Shopify webhook or periodic sync.

### CampaignShirt (Join Table)

| Field | Description | Constraints |
|-------|-------------|-------------|
| campaign_id | Parent campaign | Foreign key, not null, composite PK |
| shirt_product_id | Linked shirt | Foreign key, not null, composite PK |
| is_primary | Whether this is the hero shirt for the campaign | Boolean, default false |

### Campaign

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| name | Campaign display name | Not null |
| status | draft, scheduled, active, paused, completed, cancelled | Enum, not null |
| campaign_type | manual, weather_triggered, event_triggered, holiday, scheduled | Enum, not null |
| target_segments | Customer segments to target | At least 1 for paid campaigns |
| channels | Target channel accounts | At least 1, not null |
| scheduled_start | When to begin posting/ads | Not null for scheduled |
| scheduled_end | When to stop | Optional (can be open-ended) |
| budget_limit | Maximum spend for this campaign | Decimal, optional |
| budget_spent | Actual spend to date | Decimal, default 0 |
| auto_approved | Whether pre-approved for auto-publish | Boolean, default false |
| trigger_rule_id | Link to ContextualTrigger if auto-created | Optional |
| performance_rating | AI-generated rating (1-10) | Updated periodically |
| created_at | Creation timestamp | Auto |
| updated_at | Last update | Auto |

**State transitions**:
- draft → scheduled (when content approved and time set)
- scheduled → active (when scheduled_start reached)
- active → paused (budget limit reached OR manual pause)
- paused → active (budget increased OR manual resume)
- active → completed (scheduled_end reached OR manual stop)
- any → cancelled (manual cancellation)

### ContentVariant

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| campaign_id | Parent campaign | Foreign key, not null |
| platform | facebook, instagram, linkedin, tiktok | Enum, not null |
| copy_text | Post body text | Not null |
| hashtags | Generated hashtags | Array of strings |
| call_to_action | CTA text and link | Optional |
| approval_status | pending, approved, rejected, revision_requested | Enum, default pending |
| depth_score_clarity | DEPTH self-score (1-10) | Not null |
| depth_score_persuasion | DEPTH self-score (1-10) | Not null |
| depth_score_actionability | DEPTH self-score (1-10) | Not null |
| depth_score_accuracy | DEPTH self-score (1-10) | Not null |
| uncertain_claims | Flagged claims with explanations | Array, optional |
| created_at | Generation timestamp | Auto |

**Validation**: All depth scores must be >= 8 for auto-approval eligibility. Variants with any score < 8 are auto-improved before presenting.

### CreativeAsset

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| content_variant_id | Parent content variant | Foreign key, not null |
| asset_type | image, carousel_slide, video_thumbnail | Enum, not null |
| source_product_image_url | Original Shopify product image | Not null |
| generated_image_url | Composited/generated image | Not null after generation |
| overlay_text | Text overlaid on image | Optional |
| aspect_ratio | 1:1, 4:5, 16:9, 9:16 | Enum, not null |
| slide_order | Position in carousel (1-indexed) | Integer, optional |
| approval_status | pending, approved, rejected | Enum, default pending |

### ChannelAccount

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| platform | facebook, instagram, linkedin, tiktok | Enum, not null |
| account_name | Display name | Not null |
| account_id | Platform-specific account/page ID | Not null |
| access_token | Encrypted OAuth token | Stored in Supabase Vault |
| token_expires_at | Token expiry | Not null |
| is_active | Whether account is connected and valid | Boolean, default true |
| default_budget_limit | Default weekly spend limit for this channel | Decimal, optional |
| created_at | Connection timestamp | Auto |

### ChannelPost

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| campaign_id | Parent campaign | Foreign key, not null |
| channel_account_id | Target channel | Foreign key, not null |
| content_variant_id | Content used | Foreign key, not null |
| platform_post_id | ID returned by platform API after posting | Set after publish |
| status | queued, published, failed, removed | Enum, not null |
| published_at | Actual publish timestamp | Set after publish |
| impressions | Current impression count | Updated periodically |
| clicks | Current click count | Updated periodically |
| engagement_count | Likes + comments + shares | Updated periodically |
| spend | Ad spend attributed to this post | Decimal, default 0 |
| error_message | If publish failed | Optional |

### CustomerSegment

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| name | Descriptive name (e.g., "55-65, subtle prints, special occasions") | Not null |
| source | survey, klaviyo, manual, combined | Enum, not null |
| age_range | Target age bracket | Optional |
| style_preference | bold, subtle, mixed | Enum, optional |
| purchase_occasions | Array of occasion types | Optional |
| purchase_intent | high, medium, low | Enum, optional |
| klaviyo_segment_id | Linked Klaviyo segment | Optional |
| member_count | Approximate segment size | Integer, optional |
| last_synced_at | Last sync with source | Auto |

### ContextualTrigger

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| name | Descriptive name | Not null |
| trigger_type | weather, event, holiday, seasonal | Enum, not null |
| conditions | JSON rules (e.g., {"temp_min": 20, "weather": "sunny"}) | JSONB, not null |
| matched_shirts | Shirt IDs to promote when triggered | Array, not null |
| content_template_id | Pre-approved content template for auto-publish | Optional |
| is_active | Whether trigger is enabled | Boolean, default true |
| last_fired_at | Last time this trigger activated | Optional |
| cooldown_hours | Minimum hours between firings | Integer, default 24 |

### ContentTemplate

Pre-approved content structure for auto-publish trigger campaigns (FR-017).

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| name | Template name | Not null |
| platform | Target platform | Enum, not null |
| copy_template | Copy with placeholders (e.g., {shirt_name}, {weather}) | Not null |
| hashtag_template | Default hashtags | Array of strings |
| cta_template | CTA with placeholders | Optional |
| style_preset | Creative style instructions for image compositing | Optional |
| is_active | Whether available for trigger use | Boolean, default true |
| created_at | Creation timestamp | Auto |

### BudgetRule

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| scope | channel, campaign, global | Enum, not null |
| channel_account_id | If scope is channel | Optional foreign key |
| campaign_id | If scope is campaign | Optional foreign key |
| period | daily, weekly, monthly | Enum, not null |
| limit_amount | Maximum spend for period | Decimal, not null |
| current_spend | Accumulated spend in current period | Decimal, default 0 |
| alert_threshold_pct | Percentage at which to alert (e.g., 80) | Integer, default 80 |
| auto_pause | Whether to auto-pause at limit | Boolean, default true |
| period_reset_at | When current period resets | Timestamp, not null |

### EngagementReply

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| channel_post_id | Parent post | Foreign key, not null |
| platform_comment_id | Platform's comment ID | Not null |
| comment_text | Original comment text | Not null |
| comment_author | Author name/handle | Not null |
| sentiment | positive, neutral, negative, inappropriate | Enum, not null |
| reply_text | Generated reply | Not null |
| reply_status | pending_review, auto_sent, manually_sent, skipped, flagged | Enum, not null |
| product_nudge_shirt_id | If reply includes product nudge | Optional foreign key |
| created_at | Detection timestamp | Auto |
| replied_at | When reply was sent | Optional |

### PerformanceSnapshot

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| campaign_id | Parent campaign | Foreign key, not null |
| snapshot_at | Timestamp of metrics capture | Not null |
| total_impressions | Aggregate impressions | Integer |
| total_clicks | Aggregate clicks | Integer |
| total_spend | Aggregate spend | Decimal |
| total_conversions | Purchases attributed | Integer |
| roi | Calculated return on investment | Decimal |
| ai_rating | AI performance assessment (1-10) | Integer |
| ai_commentary | AI narrative on performance | Text |

### SpendLog

| Field | Description | Constraints |
|-------|-------------|-------------|
| id | Primary key | Auto-generated |
| campaign_id | Campaign | Foreign key, not null |
| channel_account_id | Channel | Foreign key, not null |
| amount | Spend amount | Decimal, not null |
| currency | GBP | Default GBP |
| logged_at | When spend occurred | Not null |
| description | What the spend was for | Optional |
