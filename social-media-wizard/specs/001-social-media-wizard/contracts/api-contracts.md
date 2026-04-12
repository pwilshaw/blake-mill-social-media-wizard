# API Contracts: Social Media Wizard

**Feature**: 001-social-media-wizard  
**Date**: 2026-04-11

## Internal API (Supabase Edge Functions)

These are the internal endpoints the frontend calls. All require authenticated Supabase session.

### Campaigns

```
GET    /functions/v1/campaigns              → List campaigns (filterable by status, date range)
GET    /functions/v1/campaigns/:id           → Campaign detail with metrics
POST   /functions/v1/campaigns               → Create campaign (draft)
PATCH  /functions/v1/campaigns/:id           → Update campaign (status, budget, schedule)
DELETE /functions/v1/campaigns/:id           → Cancel campaign
```

### Content Generation

```
POST   /functions/v1/generate-content        → Generate content variants for a campaign using DEPTH method
  Body: { campaign_id, shirt_ids, platform, context_overrides? }
  Returns: { variants: ContentVariant[] }

POST   /functions/v1/generate-creatives      → Generate carousel/image creatives
  Body: { content_variant_id, aspect_ratios, style_preset? }
  Returns: { assets: CreativeAsset[] }

PATCH  /functions/v1/content-variants/:id    → Approve/reject content variant
  Body: { approval_status: "approved" | "rejected" | "revision_requested" }
```

### Channel Management

```
GET    /functions/v1/channels                → List connected channel accounts
POST   /functions/v1/channels/connect        → Initiate OAuth flow for platform
  Body: { platform: "facebook" | "instagram" | "linkedin" }
  Returns: { oauth_url: string }

POST   /functions/v1/channels/callback       → OAuth callback handler
DELETE /functions/v1/channels/:id            → Disconnect channel
```

### Publishing & Scheduling

```
POST   /functions/v1/publish                 → Publish approved content to channel(s)
  Body: { campaign_id, channel_ids?, scheduled_at? }
  Returns: { posts: ChannelPost[] }

GET    /functions/v1/schedule                → Get scheduled posts (calendar view data)
  Query: { start_date, end_date, channel_id? }
```

### Performance & Analytics

```
GET    /functions/v1/dashboard/metrics       → Live dashboard metrics
  Query: { period: "today" | "7d" | "30d" | "custom", start?, end? }
  Returns: { impressions, clicks, spend, conversions, roi, campaigns_active }

GET    /functions/v1/campaigns/:id/performance → Campaign performance detail
  Returns: { snapshots: PerformanceSnapshot[], ai_rating, ai_commentary }
```

### Customer Segments

```
GET    /functions/v1/segments                → List customer segments
POST   /functions/v1/segments/import-survey  → Import survey CSV
  Body: FormData with CSV file
  Returns: { segments_created: number, profiles_processed: number }

POST   /functions/v1/segments/sync-klaviyo   → Trigger Klaviyo segment sync
```

### Budget Management

```
GET    /functions/v1/budgets                 → List budget rules
POST   /functions/v1/budgets                 → Create budget rule
PATCH  /functions/v1/budgets/:id            → Update budget rule
GET    /functions/v1/spend-log              → Get spend history
  Query: { period, channel_id?, campaign_id? }
```

### Triggers & Automation

```
GET    /functions/v1/triggers                → List contextual triggers
POST   /functions/v1/triggers                → Create trigger rule
PATCH  /functions/v1/triggers/:id           → Update trigger
DELETE /functions/v1/triggers/:id           → Disable/delete trigger
```

### Engagement

```
GET    /functions/v1/engagement/comments     → List comments needing review
  Query: { status: "pending_review" | "flagged", channel_id? }

PATCH  /functions/v1/engagement/replies/:id  → Approve/edit/send reply
  Body: { reply_status, reply_text? }
```

## External API Dependencies

### Meta Graph API v22.0

```
POST   /v22.0/{page-id}/feed                → Publish post
POST   /v22.0/act_{ad-account-id}/campaigns → Create ad campaign
GET    /v22.0/{post-id}/comments             → Read comments
POST   /v22.0/{comment-id}/comments          → Reply to comment
GET    /v22.0/{post-id}/insights             → Get post metrics
GET    /v22.0/act_{ad-account-id}/insights   → Get ad spend/performance
```

### Shopify GraphQL Admin API

```
POST   /admin/api/2024-10/graphql.json       → Query products, inventory, images
  Queries: products, inventoryLevels, productImages
  Webhooks: inventory_levels/update, products/update
```

### Klaviyo API (revision 2024-10-15)

```
GET    /api/segments                          → List segments
GET    /api/segments/{id}/profiles            → Get segment members
POST   /api/profile-import                    → Upsert profiles from survey data
```

### WeatherAPI

```
GET    /v1/forecast.json?q={postcode}&days=7  → 7-day UK forecast
```

### PredictHQ / Ticketmaster

```
GET    /v1/events?country=GB&category=...     → PredictHQ events
GET    /discovery/v2/events.json?postalCode=...&countryCode=GB → Ticketmaster events
```

## Webhook Contracts (Inbound)

```
POST   /functions/v1/webhooks/shopify        → Shopify product/inventory updates
  Headers: X-Shopify-Hmac-Sha256 (verify signature)

POST   /functions/v1/webhooks/meta           → Meta webhook for comment notifications
  Verify: hub.verify_token on subscription, X-Hub-Signature-256 on events
```

## Scheduled Jobs (Cron)

```
Every 6 hours  → Check weather triggers, fire matching campaigns
Every 1 hour   → Check event triggers (PredictHQ + Ticketmaster)
Every 15 min   → Sync post metrics from Meta API
Every 1 hour   → Check for new comments, generate replies
Every 24 hours → Sync Shopify product catalogue
Every 24 hours → Reset daily budget counters
Every 7 days   → Generate weekly performance summaries
```
