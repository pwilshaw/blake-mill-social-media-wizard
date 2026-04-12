# Blake Mill Social Media Wizard

## Active Technologies
- TypeScript 5.x + React 19 + Vite + Tailwind CSS v4 + shadcn/ui (001-social-media-wizard)
- Supabase (PostgreSQL, Edge Functions, Vault, Realtime) (001-social-media-wizard)
- @supabase/supabase-js, @anthropic-ai/sdk, sharp (001-social-media-wizard)
- Vercel (frontend hosting + Node.js serverless for image processing) (001-social-media-wizard)
- Recharts (dashboard charts, performance visualization)

## Project Structure

```text
src/                     # React frontend (13 pages, lazy-loaded)
src/lib/platforms.ts     # Platform metadata (6 platforms)
src/lib/types.ts         # Entity types + AI Media Buyer + Conversion tracking
supabase/functions/      # 16 Supabase Edge Functions (Deno)
supabase/migrations/     # Database migrations
api/generate-image/      # Vercel serverless — sharp image compositing
specs/                   # Feature specifications
tests/                   # Unit, integration, E2E tests
```

## Pages (13 routes)

1. Dashboard — KPI cards with sparklines, tabbed (Overview/Campaigns/Analytics), quick actions
2. Campaigns — list + status filters + quick launch templates + wizard
3. Campaign Detail — metrics, schedule, channels, links to content/creatives
4. Content Review — approve/reject/revise AI-generated content variants
5. Creative Gallery — visual asset approval + carousel preview
6. Calendar — month grid + timeline views
7. Channels — omnichannel connections (Facebook, Instagram, Google Ads, TikTok, Snapchat, LinkedIn)
8. Segments — customer segments from Klaviyo/surveys
9. Triggers — weather/event-based auto-campaigns + templates
10. Budget — rules + spend tracker + historical chart
11. Engagement — AI reply review + sentiment + bulk send
12. AI Media Buyer — 24/7 optimization, bid/audience/budget actions, settings, history
13. Conversions — real-time tracking, multi-touch attribution, conversion funnel

## Commands

```bash
npm run dev              # Start frontend dev server
npm run build            # Production build
npm run lint             # Lint check
npm run test             # Run tests
```

## Code Style

- TypeScript strict mode
- Use design system tokens (no hardcoded colours/spacing)
- WCAG AA accessibility required
- shadcn/ui components as base
- Use `npm install --legacy-peer-deps` for dependency installation

## External Integrations

- Meta Graph API v22.0 (Facebook/Instagram publishing, ads, comments)
- Google Ads API (search/display campaigns)
- Snapchat Marketing API (snap ads)
- Shopify GraphQL Admin API (product catalogue, inventory)
- Klaviyo API (customer segments, profiles)
- WeatherAPI (7-day UK forecast)
- PredictHQ + Ticketmaster (event detection)
- Claude API / Anthropic SDK (DEPTH method content generation)

## Key Decisions

- No Supabase CLI — deploy via dashboard only
- Image compositing via Vercel serverless (sharp) not Edge Functions (Deno)
- Content requires approval by default; pre-approved templates can auto-publish
- Single user (owner) — no multi-user auth needed initially
- All routes lazy-loaded via React.lazy + Suspense for code splitting
- Sidebar is collapsible on desktop, sectioned navigation
