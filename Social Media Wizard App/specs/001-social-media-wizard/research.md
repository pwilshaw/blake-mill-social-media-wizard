# Research: Social Media Wizard

**Feature**: 001-social-media-wizard  
**Date**: 2026-04-11

## 1. Social Platform Publishing — Meta Graph API

**Decision**: Meta Graph API v22.0 via REST  
**Rationale**: Only official path for publishing posts, managing ads, reading/replying to comments on Facebook and Instagram. Well-documented, stable.  
**Alternatives considered**: Third-party tools (Buffer, Hootsuite APIs) — rejected because they add cost, latency, and limit ad management capabilities.

**Key details**:
- Permissions required: `pages_manage_posts`, `pages_read_engagement`, `ads_management`, `ads_read`, `pages_read_user_content`, `pages_manage_engagement`
- App Review required (5+ business days) with screencasts demonstrating use
- Rate limits apply — auto-replies at scale can trigger spam detection
- Same API covers Instagram via Instagram Graph API (connected accounts)

## 2. Product Data Source — Shopify Admin API

**Decision**: Shopify GraphQL Admin API via custom app  
**Rationale**: Server-side access to full product data (inventory, variants, images, metafields, stock status). More efficient than REST for fetching related data in single queries.  
**Alternatives considered**: Shopify MCP (AI-agent bridge, not production-ready), Storefront API (public/customer-facing, no inventory data).

**Key details**:
- Custom App created in Shopify admin with scopes: `read_products`, `read_inventory`
- Rate limit: cost-based throttling for GraphQL (~1,000 points/second)
- Webhook support for real-time stock changes (inventory level updates)

## 3. Customer Intelligence — Klaviyo API

**Decision**: Klaviyo API (revision 2024-10-15)  
**Rationale**: Direct access to customer segments, profiles, and email/SMS engagement data. Already used by Blake Mill.  
**Alternatives considered**: CSV export only — rejected because it's manual and doesn't support real-time segment membership.

**Key details**:
- Fetch segments via `GET /api/segments`, profiles via `GET /api/segments/{id}/profiles`
- Upsert profiles for syncing survey data back to Klaviyo
- Segment membership is eventually consistent (minutes delay after changes)

## 4. Weather Data — WeatherAPI

**Decision**: WeatherAPI (weatherapi.com)  
**Rationale**: Most generous free tier (1M calls/month), clean JSON API, 7-day forecast, location-based, good UK accuracy.  
**Alternatives considered**: OpenWeatherMap (1k/day free — too restrictive), Met Office DataHub (best UK accuracy but poor developer experience, XML-heavy).

**Key details**:
- 7-day forecast with hourly breakdown
- Location by UK postcode or city name
- Free tier is sufficient for this use case (checking forecast once per scheduling cycle)

## 5. Event Detection — PredictHQ + Ticketmaster

**Decision**: PredictHQ as primary (aggregated events), Ticketmaster Discovery API as supplement for music/gigs  
**Rationale**: PredictHQ aggregates across categories (music, sports, cultural, holidays, public events) into a single unified feed. Ticketmaster adds depth for specific gig data (artist details, venue capacity, ticket status).  
**Alternatives considered**: Songkick (deprecated), Google Events (no public API), web scraping (fragile, maintenance burden).

**Key details**:
- PredictHQ: 100 events/day free, filter by category + location + radius
- Ticketmaster: 5,000 calls/day free, filter by UK postcode/radius, music/sports focus
- Combine both for comprehensive coverage of Stone Roses gigs, rugby events, festivals, holidays

## 6. Creative Generation — Hybrid Approach

**Decision**: Server-side image compositing (sharp/node-canvas) for branded overlays + Gemini Imagen 3 for creative backgrounds  
**Rationale**: Brand fonts, logos, and exact text placement need pixel-perfect control (non-deterministic AI can't guarantee this). AI generation is used only for creative background treatments where variation is desirable.  
**Alternatives considered**: Full AI generation via Stability AI or DALL-E — rejected because brand consistency on text overlays is unreliable with AI-only approaches.

**Key details**:
- sharp (Node.js) for compositing product photos with text overlays, brand colours, logos
- Gemini Imagen 3 (free tier) for optional creative background generation
- Product photos fetched from Shopify as source images
- Output in platform-specific aspect ratios (1:1 for Instagram, 16:9 for Facebook, etc.)

## 7. Tech Stack — Supabase + Vercel

**Decision**: React + TypeScript + Vite on Vercel (frontend), Supabase Edge Functions for API proxying + scheduled jobs, Vercel serverless for image processing  
**Rationale**: Blake Mill already uses Supabase and Vercel. Edge Functions handle cron-triggered posting and API key storage (Vault). Vercel serverless handles Node-specific workloads (sharp for image compositing).  
**Alternatives considered**: Standalone Express server (extra infrastructure), Next.js (unnecessary framework migration), pure Supabase (Edge Functions run Deno, sharp not available).

**Key details**:
- Supabase Edge Functions (Deno) for: scheduled posting, Meta API calls, weather/event checks, Klaviyo sync
- Supabase Database for: campaigns, content variants, budget tracking, engagement logs
- Supabase Vault for: API keys (Meta, Shopify, Klaviyo, etc.)
- Vercel serverless (Node) for: image compositing with sharp
- Supabase Realtime for: dashboard live metric updates
- Cron via Supabase pg_cron or external scheduler for: posting schedule, weather checks, event detection

## 8. Content Generation — Claude API with DEPTH Method

**Decision**: Claude API (Anthropic SDK) for content generation with structured DEPTH method prompting  
**Rationale**: The DEPTH method requires multi-perspective reasoning, self-evaluation, and iterative improvement — capabilities well-suited to Claude. Already in the Anthropic ecosystem.  
**Alternatives considered**: OpenAI GPT-4 (comparable but no existing ecosystem relationship), local models (insufficient quality for brand-critical content).

**Key details**:
- Structured system prompt implementing DEPTH method roles (psychologist, copywriter, analyst)
- Self-scoring on clarity, persuasion, actionability, factual accuracy (1-10 scale)
- Prompt caching for efficiency across similar shirt products
- Separate prompts for: post copy, hashtags, carousel slide text, comment replies
