# Quickstart: Social Media Wizard

**Feature**: 001-social-media-wizard  
**Date**: 2026-04-11

## Prerequisites

- Node.js 20+
- Supabase account (existing: `zncwlnoobrkxfghglpep.supabase.co`)
- Vercel account (existing)
- API keys for: Meta Business, Shopify Admin, Klaviyo, WeatherAPI, PredictHQ/Ticketmaster, Anthropic (Claude)

## Project Setup

```bash
# Clone the repo
git clone https://github.com/pwilshaw/blake-mill-social-media-wizard.git
cd blake-mill-social-media-wizard

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env.local
```

## Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://zncwlnoobrkxfghglpep.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Meta/Facebook
META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>

# Shopify
SHOPIFY_STORE_DOMAIN=<your-store>.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=<your-admin-api-token>

# Klaviyo
KLAVIYO_API_KEY=<your-private-api-key>

# Weather
WEATHERAPI_KEY=<your-key>

# Events
PREDICTHQ_API_TOKEN=<your-token>
TICKETMASTER_API_KEY=<your-key>

# AI
ANTHROPIC_API_KEY=<your-key>
```

## Development

```bash
# Start the frontend dev server
npm run dev

# Start Supabase locally (for Edge Functions)
npx supabase start
npx supabase functions serve
```

## Database Setup

```bash
# Run migrations (creates all tables from data-model.md)
npx supabase db push

# Seed with shirt product data from Shopify
npm run seed:shopify
```

## First Run Checklist

1. Connect a Facebook page via the Channels settings page
2. Import survey CSV (Data/Spring 2026 file) via Segments page
3. Set a weekly budget limit in Budget settings
4. Create your first campaign — select shirts, generate content, approve, schedule
5. Set up weather triggers (e.g., sunny > 20°C → promote Violet Haze)

## Key Commands

```bash
npm run dev          # Start frontend
npm run build        # Production build
npm run lint         # Lint check
npm run test         # Run tests
npm run seed:shopify # Sync Shopify products
```
