# Implementation Plan: Social Media Wizard

**Branch**: `001-social-media-wizard` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-social-media-wizard/spec.md`

## Summary

Build a fully automated social media campaign management application for Blake Mill that generates content using the DEPTH method, creates visual carousels from Shopify product images, schedules posts based on weather/events/holidays, manages Facebook ad spend within defined budget limits, and provides a real-time performance dashboard. The system uses Supabase for backend/database, Vercel for frontend hosting, Claude API for content generation, and integrates with Meta Graph API, Shopify Admin API, Klaviyo, WeatherAPI, PredictHQ, and Ticketmaster.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: React 19, Vite, Tailwind CSS, shadcn/ui, @supabase/supabase-js, @anthropic-ai/sdk  
**Storage**: Supabase (PostgreSQL) for all application data, Supabase Vault for API secrets  
**Testing**: Vitest (unit + integration), Playwright (E2E)  
**Target Platform**: Web application (mobile-first responsive, desktop-optimised)  
**Project Type**: Web application (React frontend + Supabase Edge Functions backend)  
**Performance Goals**: Dashboard loads in < 3 seconds, content generation < 60 seconds per variant  
**Constraints**: Ad spend must never exceed user-defined limits, no content published without approval (unless pre-approved template)  
**Scale/Scope**: Single user (owner), ~30 products, ~5 campaigns active at once, 1-2 social channels initially

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Accessibility First | PASS | Dashboard, calendar, and all UI controls will follow WCAG AA. Focus states, keyboard nav, semantic HTML enforced. |
| II. Token-Driven Design | PASS | FR-020 requires use of Blake Mill design system tokens. No hardcoded colours/spacing. |
| III. Premium Visual Craft | PASS | Dashboard, calendar, and creative gallery will use layered shadows, generous whitespace, smooth transitions per constitution. |
| IV. Simplicity & Intuitiveness | PASS | Single primary action per view. Campaign wizard is step-by-step. Dashboard is read-only overview. |
| V. Consistency & Reuse | PASS | Using existing shadcn/ui components. Status colours via tokens. Consistent card/list patterns throughout. |
| VI. Responsive & Adaptive | PASS | Mobile-first responsive. Touch targets 44x44px. Light/dark/high-contrast modes via tokens. |
| VII. AI-Guided Quality | PASS | Content generation uses DEPTH method with self-scoring. Creative review gallery before publish. |

**Gate result**: PASS — no violations. Proceed to Phase 0.

**Post-Phase 1 re-check**: PASS — data model and API contracts align with all constitution principles. No complexity violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-social-media-wizard/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research output
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 quickstart guide
├── contracts/           # Phase 1 API contracts
│   └── api-contracts.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── dashboard/       # Dashboard widgets, metric cards, charts
│   ├── campaigns/       # Campaign wizard, list, detail views
│   ├── content/         # Content variant cards, approval UI, DEPTH scores
│   ├── creatives/       # Image gallery, carousel preview, approval
│   ├── calendar/        # Calendar + timeline views
│   ├── channels/        # Channel connection, OAuth flow, settings
│   ├── segments/        # Customer segment list, survey import
│   ├── triggers/        # Trigger rule builder, weather/event config
│   ├── budget/          # Budget rules, spend tracking, alerts
│   └── engagement/      # Comment review, reply approval, flagged items
├── pages/
│   ├── Dashboard.tsx
│   ├── Campaigns.tsx
│   ├── CampaignDetail.tsx
│   ├── ContentReview.tsx
│   ├── CreativeGallery.tsx
│   ├── Calendar.tsx
│   ├── Channels.tsx
│   ├── Segments.tsx
│   ├── Triggers.tsx
│   ├── Budget.tsx
│   └── Engagement.tsx
├── lib/
│   ├── supabase.ts      # Supabase client config
│   ├── api.ts           # Edge Function API client
│   ├── types.ts         # Shared TypeScript types (from data model)
│   └── utils.ts         # Formatting, date helpers
├── hooks/
│   ├── useCampaigns.ts
│   ├── useDashboard.ts
│   ├── useChannels.ts
│   └── useRealtime.ts   # Supabase Realtime subscriptions
└── contexts/
    └── AppContext.tsx    # Global app state (active channels, budget status)

supabase/
├── migrations/          # Database schema migrations
├── functions/
│   ├── campaigns/       # Campaign CRUD
│   ├── generate-content/ # DEPTH method content generation (calls Claude)
│   ├── generate-creatives/ # Image compositing (calls Vercel function)
│   ├── publish/         # Meta API publishing
│   ├── channels/        # OAuth flows, channel management
│   ├── segments/        # Survey import, Klaviyo sync
│   ├── triggers/        # Weather/event trigger evaluation
│   ├── budgets/         # Budget tracking, auto-pause
│   ├── engagement/      # Comment detection, reply generation
│   ├── dashboard/       # Metrics aggregation
│   ├── webhooks/        # Shopify + Meta webhook handlers
│   └── cron/            # Scheduled jobs (weather check, metrics sync, etc.)
└── seed.sql             # Initial data (trigger templates, budget defaults)

api/
└── generate-image/      # Vercel serverless function (Node.js + sharp for image compositing)

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: Web application with React frontend deployed on Vercel and Supabase Edge Functions as backend. Image processing runs on a dedicated Vercel serverless function (Node.js runtime) since sharp is not available in Deno Edge Functions. This avoids additional infrastructure while leveraging existing Supabase + Vercel stack.

## Complexity Tracking

No constitution violations to justify. The project uses a standard web app structure with the existing Supabase + Vercel stack. The number of integrations (6 external APIs) is inherent to the feature requirements, not unnecessary complexity.
