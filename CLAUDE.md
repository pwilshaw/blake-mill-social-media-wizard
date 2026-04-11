# Blake Mill Social Media Wizard

## Active Technologies
- TypeScript 5.x + React 19 + Vite + Tailwind CSS + shadcn/ui (001-social-media-wizard)
- Supabase (PostgreSQL, Edge Functions, Vault, Realtime) (001-social-media-wizard)
- @supabase/supabase-js, @anthropic-ai/sdk (001-social-media-wizard)
- Vercel (frontend hosting + Node.js serverless for image processing) (001-social-media-wizard)

## Project Structure

```text
src/                     # React frontend
supabase/functions/      # Supabase Edge Functions (Deno)
supabase/migrations/     # Database migrations
api/                     # Vercel serverless functions (Node.js)
specs/                   # Feature specifications
tests/                   # Unit, integration, E2E tests
```

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
