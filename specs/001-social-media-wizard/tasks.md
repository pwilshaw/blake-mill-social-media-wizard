# Tasks: Social Media Wizard

**Input**: Design documents from `/specs/001-social-media-wizard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks excluded. Add via `/speckit.tasks` with TDD flag if needed.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and deployment configuration

- [x] T001 Initialize Vite + React 19 + TypeScript project with Tailwind CSS and shadcn/ui in project root
- [x] T002 Configure ESLint, Prettier, and TypeScript strict mode in eslint.config.js, .prettierrc, tsconfig.json
- [x] T003 [P] Install core dependencies: @supabase/supabase-js, @anthropic-ai/sdk, react-router-dom, date-fns, recharts, @tanstack/react-query
- [x] T004 [P] Create .env.example with all required environment variables per specs/001-social-media-wizard/quickstart.md
- [x] T005 [P] Create Vercel configuration in vercel.json with serverless function routing for api/ directory
- [x] T006 [P] Create Supabase project via dashboard (not CLI): document project URL and anon key in .env.example, verify Edge Functions deployment path via dashboard

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared types, Supabase client, layout shell, and auth — MUST complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create shared TypeScript types from data model in src/lib/types.ts (all 13 entities: ShirtProduct, Campaign, ContentVariant, CreativeAsset, ChannelAccount, ChannelPost, CustomerSegment, ContextualTrigger, BudgetRule, EngagementReply, PerformanceSnapshot, SpendLog, plus enums)
- [x] T008 Create Supabase database migration for all tables in supabase/migrations/001_initial_schema.sql (ShirtProduct, Campaign, ContentVariant, CreativeAsset, ChannelAccount, ChannelPost, CustomerSegment, ContextualTrigger, BudgetRule, EngagementReply, PerformanceSnapshot, SpendLog with all foreign keys, enums, indexes)
- [x] T009 Create Row Level Security policies in supabase/migrations/002_rls_policies.sql (single owner — allow all operations for authenticated user)
- [x] T009b [P] Configure Supabase Auth for single-owner access: enable email/password provider in Supabase dashboard, create owner account, add auth helper in src/lib/auth.ts (login, logout, session check), add ProtectedRoute wrapper in src/components/ui/ProtectedRoute.tsx
- [x] T010 [P] Configure Supabase client in src/lib/supabase.ts with typed client using generated types
- [x] T011 [P] Create API client utility in src/lib/api.ts for calling Supabase Edge Functions with error handling
- [x] T012 [P] Create utility functions in src/lib/utils.ts (currency formatting, date formatting, percentage calc, status colour mapping)
- [x] T013 Create app shell layout with sidebar navigation in src/components/ui/AppLayout.tsx (links to: Dashboard, Campaigns, Calendar, Channels, Segments, Triggers, Budget, Engagement)
- [x] T013b Fetch Blake Mill design tokens from MCP server (https://preview--designtokensforhumans.lovable.app/api/mcp) and create src/lib/blake-mill-tokens.ts mapping token values to Tailwind CSS custom properties. Reference these tokens in tailwind.config.ts theme extension.
- [x] T014 Configure React Router with all page routes in src/App.tsx
- [x] T015 [P] Create AppContext provider in src/contexts/AppContext.tsx (active channels, budget status, global loading states)
- [x] T016 [P] Create useRealtime hook in src/hooks/useRealtime.ts for Supabase Realtime subscriptions
- [x] T017 Create seed data migration in supabase/seed.sql (sample trigger templates for weather/events, default budget rules)

**Checkpoint**: Foundation ready — database schema deployed, app shell navigable, Supabase connected. User story implementation can now begin.

---

## Phase 3: User Story 1 — Campaign Dashboard & Calendar (Priority: P1) MVP

**Goal**: Visual dashboard showing live performance metrics alongside a calendar/timeline of all campaigns, colour-coded by status.

**Independent Test**: Open the dashboard page and verify metric cards display data, calendar shows campaigns by status, and timeline view is navigable. Works with seed/mock data before other stories are implemented.

### Implementation for User Story 1

- [x] T018 [P] [US1] Create MetricCard component in src/components/dashboard/MetricCard.tsx (impressions, clicks, spend, conversions, ROI — each with trend indicator)
- [x] T019 [P] [US1] Create PerformanceChart component in src/components/dashboard/PerformanceChart.tsx (line/area chart using recharts for spend, engagement, and conversions over time)
- [x] T020 [P] [US1] Create CampaignStatusBadge component in src/components/campaigns/CampaignStatusBadge.tsx (draft, scheduled, active, paused, completed, cancelled — colour-coded)
- [x] T021 [US1] Create useDashboard hook in src/hooks/useDashboard.ts (fetches aggregated metrics from dashboard/metrics Edge Function, subscribes to Realtime updates)
- [x] T022 [US1] Create dashboard metrics Edge Function in supabase/functions/dashboard/index.ts (aggregates PerformanceSnapshot + SpendLog data by period: today, 7d, 30d, custom)
- [x] T023 [P] [US1] Create CalendarView component in src/components/calendar/CalendarView.tsx (month view with campaign blocks colour-coded by status, clickable to campaign detail)
- [x] T024 [P] [US1] Create TimelineView component in src/components/calendar/TimelineView.tsx (horizontal timeline with campaign bars, overlap indicators, performance trend sparklines)
- [x] T025 [US1] Create useCampaigns hook in src/hooks/useCampaigns.ts (CRUD operations, status filtering, date range queries via Supabase client)
- [x] T026 [US1] Create campaigns Edge Function in supabase/functions/campaigns/index.ts (GET list with filters, GET detail with metrics, POST create draft, PATCH update, DELETE cancel)
- [x] T027 [US1] Create CampaignDetailPanel component in src/components/campaigns/CampaignDetailPanel.tsx (shows real-time engagement, spend vs budget, AI performance rating 1-10 with commentary)
- [x] T028 [US1] Create Dashboard page in src/pages/Dashboard.tsx (MetricCards row, PerformanceChart, toggle between CalendarView and TimelineView, campaign list sidebar)
- [x] T029 [US1] Create Calendar page in src/pages/Calendar.tsx (full-page calendar/timeline with date range picker and channel filter)
- [x] T030 [US1] Create schedule Edge Function in supabase/functions/schedule/index.ts (GET scheduled posts by date range and channel for calendar data)

**Checkpoint**: Dashboard shows metrics and campaigns. Calendar/timeline navigable. All with seed or mock data. MVP deliverable.

---

## Phase 4: User Story 2 — Automated Content Creation Using DEPTH Method (Priority: P1)

**Goal**: Generate high-performing social media copy for each shirt using the DEPTH method (multi-perspective, self-scoring, iterative improvement) via Claude API.

**Independent Test**: Select a shirt, trigger content generation, verify variants show 3 expert perspectives, DEPTH scores (1-10), uncertain claims flagged, and approval workflow functions.

### Implementation for User Story 2

- [ ] T031 [P] [US2] Create DEPTH method system prompt template in src/lib/depth-prompts.ts (three expert roles: behavioural psychologist, direct response copywriter, data analyst; self-scoring instructions; uncertain claim flagging)
- [ ] T032 [P] [US2] Create ContentVariantCard component in src/components/content/ContentVariantCard.tsx (displays copy, hashtags, CTA, DEPTH scores as 4 radial gauges, uncertain claims highlighted, approve/reject/revise buttons)
- [ ] T033 [US2] Create generate-content Edge Function in supabase/functions/generate-content/index.ts (accepts campaign_id + shirt_ids + platform; validates all shirts are in_stock — rejects out-of-stock with error; calls Claude API with DEPTH prompt; returns ContentVariant[] with scores; auto-improves any dimension < 8 before returning)
- [ ] T034 [US2] Create ContentReview page in src/pages/ContentReview.tsx (select campaign, view all generated variants in grid, bulk approve/reject, filter by platform and score)
- [ ] T035 [US2] Create content-variants Edge Function in supabase/functions/content-variants/index.ts (PATCH approval_status, GET variants by campaign with filtering)
- [ ] T036 [US2] Create Campaigns page in src/pages/Campaigns.tsx (list all campaigns, create new draft, select shirts from Shopify catalogue, trigger content generation, link to ContentReview)
- [ ] T037 [US2] Create CampaignWizard component in src/components/campaigns/CampaignWizard.tsx (step-by-step: select shirts from Shopify catalogue — out-of-stock greyed out and unselectable → choose channels → set schedule → set budget → generate content → review → approve → schedule)

**Checkpoint**: Can generate DEPTH method content for shirts, review scores, approve/reject variants. Campaign creation wizard functional.

---

## Phase 5: User Story 3 — AI-Generated Visual Creatives & Carousels (Priority: P1)

**Goal**: Generate carousel images combining real Shopify product photos with branded messaging using sharp (server-side compositing) and optional Gemini creative backgrounds.

**Independent Test**: Select a shirt with Shopify images, generate carousel slides, verify product photo is composited with text overlay in correct aspect ratios, review in gallery with approve/reject.

### Implementation for User Story 3

- [ ] T038 [P] [US3] Create Vercel serverless image compositing function in api/generate-image/index.ts (accepts product image URL + overlay text + brand colours + aspect ratio; uses sharp to composite; returns generated image URL)
- [ ] T039 [P] [US3] Create CreativeGallery component in src/components/creatives/CreativeGallery.tsx (grid of generated images with approve/reject/modify per slide, carousel preview with swipe)
- [ ] T040 [P] [US3] Create CarouselPreview component in src/components/creatives/CarouselPreview.tsx (simulates platform-specific carousel display: Facebook multi-image, Instagram swipe)
- [ ] T041 [US3] Create generate-creatives Edge Function in supabase/functions/generate-creatives/index.ts (accepts content_variant_id + aspect_ratios; fetches shirt's Shopify images; calls Vercel image function for each slide; stores CreativeAsset records)
- [ ] T042 [US3] Create CreativeGallery page in src/pages/CreativeGallery.tsx (select campaign, view all creative assets, filter by aspect ratio and approval status, bulk approve)
- [ ] T043 [US3] Create Shopify product sync Edge Function in supabase/functions/webhooks/shopify/index.ts (handles product/update and inventory_levels/update webhooks; verifies HMAC signature; upserts ShirtProduct records)
- [ ] T044 [US3] Create manual Shopify sync Edge Function in supabase/functions/sync-shopify/index.ts (fetches all products via Shopify GraphQL Admin API; upserts ShirtProduct table; called on-demand or daily cron)

**Checkpoint**: Can fetch Shopify products, generate branded carousel images, review in gallery, approve for publishing.

---

## Phase 6: User Story 4 — Smart Scheduling with Weather, Events & Holidays (Priority: P2)

**Goal**: Automatically schedule posts based on weather forecasts, public holidays, cultural events, and real-world happenings, matching the right shirts to the right moments.

**Independent Test**: Create weather and event triggers, verify scheduler matches triggers to shirts (e.g., sunny > 20C → Violet Haze; Stone Roses gig → Adore the Mess), and creates draft campaigns with appropriate timing.

### Implementation for User Story 4

- [ ] T045 [P] [US4] Create TriggerRuleBuilder component in src/components/triggers/TriggerRuleBuilder.tsx (form for: trigger type selection, weather conditions with temp/condition inputs, event keyword matching, holiday selection, shirt mapping, cooldown hours, auto-approve toggle, content template selection for auto-publish)
- [ ] T046 [P] [US4] Create WeatherCard component in src/components/triggers/WeatherCard.tsx (displays current 7-day forecast with trigger match indicators)
- [ ] T047 [P] [US4] Create EventFeed component in src/components/triggers/EventFeed.tsx (lists detected events from PredictHQ + Ticketmaster with relevance scores and matched triggers)
- [ ] T048 [US4] Create triggers CRUD Edge Function in supabase/functions/triggers/index.ts (GET/POST/PATCH/DELETE for ContextualTrigger records)
- [ ] T048b [P] [US4] Create ContentTemplate CRUD Edge Function in supabase/functions/content-templates/index.ts (GET/POST/PATCH/DELETE for pre-approved content templates with placeholder support)
- [ ] T048c [P] [US4] Create TemplateEditor component in src/components/triggers/TemplateEditor.tsx (edit copy/hashtag/CTA templates with {shirt_name}, {weather}, {event} placeholders, preview with sample data)
- [ ] T049 [US4] Create weather check cron Edge Function in supabase/functions/cron/weather-check/index.ts (calls WeatherAPI for UK forecast, evaluates all active weather triggers, creates draft or auto-approved campaigns for matches, respects cooldown_hours)
- [ ] T050 [US4] Create event check cron Edge Function in supabase/functions/cron/event-check/index.ts (calls PredictHQ + Ticketmaster APIs, matches events to trigger keywords, creates campaigns for matches)
- [ ] T051 [US4] Create Triggers page in src/pages/Triggers.tsx (list active triggers, create/edit via TriggerRuleBuilder, show recent trigger firings, weather forecast panel, event feed)

**Checkpoint**: Weather and event triggers configurable. Scheduler evaluates triggers on cron and creates campaigns. Manual and auto-approved paths working.

---

## Phase 7: User Story 5 — Customer Intelligence from Surveys & Klaviyo (Priority: P2)

**Goal**: Import survey data and Klaviyo segments to build customer profiles that inform which shirts are promoted to which audience segments.

**Independent Test**: Import Spring 2026 survey CSV, verify system extracts segments (e.g., "55-65, subtle prints, special occasions"), and verify campaign targeting respects segment preferences.

### Implementation for User Story 5

- [ ] T052 [P] [US5] Create SurveyImporter component in src/components/segments/SurveyImporter.tsx (CSV file upload with drag-and-drop, column mapping preview, import progress, segment extraction summary)
- [ ] T053 [P] [US5] Create SegmentCard component in src/components/segments/SegmentCard.tsx (displays segment name, member count, style preference, age range, top occasions, linked Klaviyo segment)
- [ ] T054 [US5] Create survey import Edge Function in supabase/functions/segments/import-survey/index.ts (parses CSV, extracts age_range, style preference from boldness scores, purchase_intent, wear_occasions; creates/updates CustomerSegment records; maps to ShirtProduct style_boldness)
- [ ] T055 [US5] Create Klaviyo sync Edge Function in supabase/functions/segments/sync-klaviyo/index.ts (fetches Klaviyo segments and profiles, maps to CustomerSegment records, upserts profile data)
- [ ] T056 [US5] Create segments CRUD Edge Function in supabase/functions/segments/index.ts (GET list, GET detail with member profiles, POST manual segment, PATCH update)
- [ ] T057 [US5] Create Segments page in src/pages/Segments.tsx (segment list with filters, survey import panel, Klaviyo sync button, segment detail with shirt recommendations)
- [ ] T058 [US5] Update CampaignWizard in src/components/campaigns/CampaignWizard.tsx to add segment targeting step (select target segments, preview matched shirts based on style preferences, warn if bold shirt selected for subtle-preference segment)

**Checkpoint**: Survey data imported, segments extracted, Klaviyo synced. Campaign targeting respects segment style preferences.

---

## Phase 8: User Story 6 — Facebook Publishing & Ad Spend Management (Priority: P2)

**Goal**: Automatically publish approved content to Facebook, manage ad spend within budget limits, and report on campaign performance with honest AI ratings.

**Independent Test**: Connect Facebook page, set weekly budget, publish an approved post, verify spend tracking, verify auto-pause at budget limit, verify AI performance rating appears after 48 hours.

### Implementation for User Story 6

- [ ] T059 [P] [US6] Create ChannelConnector component in src/components/channels/ChannelConnector.tsx (platform selection, OAuth initiation button, connection status, disconnect option)
- [ ] T060 [P] [US6] Create BudgetRuleEditor component in src/components/budget/BudgetRuleEditor.tsx (scope: channel/campaign/global, period: daily/weekly/monthly, limit amount input, alert threshold slider, auto-pause toggle)
- [ ] T061 [P] [US6] Create SpendTracker component in src/components/budget/SpendTracker.tsx (current spend vs limit bar chart, spend history line chart, alert indicators)
- [ ] T062 [US6] Create channels OAuth Edge Function in supabase/functions/channels/index.ts (GET list, POST connect initiates Meta OAuth, POST callback exchanges code for token and stores in Vault, DELETE disconnect)
- [ ] T063 [US6] Create publish Edge Function in supabase/functions/publish/index.ts (POST publishes approved ContentVariant to Meta Graph API v22.0 via page access token; creates ChannelPost record; handles scheduled_at for future posts)
- [ ] T064 [US6] Create budgets CRUD Edge Function in supabase/functions/budgets/index.ts (GET/POST/PATCH BudgetRule records; GET spend-log with filters)
- [ ] T065 [US6] Create metrics sync cron Edge Function in supabase/functions/cron/metrics-sync/index.ts (every 15 min: fetches post insights from Meta API, updates ChannelPost metrics, creates PerformanceSnapshot, writes SpendLog entries for each spend delta per campaign + channel, checks budget limits and auto-pauses if exceeded)
- [ ] T066 [US6] Create AI performance rating Edge Function in supabase/functions/campaigns/rate-performance/index.ts (calls Claude API with campaign metrics + comment data, generates honest 1-10 rating with commentary)
- [ ] T067 [US6] Create Channels page in src/pages/Channels.tsx (connected accounts list, add channel flow, per-channel settings)
- [ ] T068 [US6] Create Budget page in src/pages/Budget.tsx (budget rules list, editor, spend tracker, spend log table)
- [ ] T069 [US6] Create Meta webhook handler in supabase/functions/webhooks/meta/index.ts (verifies X-Hub-Signature-256, processes comment notifications for Engagement story)

**Checkpoint**: Facebook connected, posts publishing, spend tracked, budget auto-pause working, AI performance ratings generated.

---

## Phase 9: User Story 7 — Automated Engagement & Witty Replies (Priority: P3)

**Goal**: Auto-generate witty, brand-appropriate replies to post comments with soft product nudges, flagging negative/inappropriate comments for manual review.

**Independent Test**: Simulate incoming comments on a published post, verify system classifies sentiment, generates witty replies for positive/neutral comments with product nudges, and flags negative comments for review.

### Implementation for User Story 7

- [ ] T070 [P] [US7] Create CommentCard component in src/components/engagement/CommentCard.tsx (displays comment text, author, sentiment badge, generated reply with edit field, send/skip/flag actions)
- [ ] T071 [P] [US7] Create reply generation prompt in src/lib/engagement-prompts.ts (Blake Mill brand voice: witty, irreverent, never offensive; soft product nudge rules; sentiment classification; escalation criteria for negative/inappropriate)
- [ ] T072 [US7] Create comment detection cron Edge Function in supabase/functions/cron/comment-check/index.ts (every hour: fetches new comments from Meta API for all published posts, classifies sentiment, generates replies via Claude API, stores EngagementReply records)
- [ ] T073 [US7] Create engagement Edge Function in supabase/functions/engagement/index.ts (GET comments needing review filtered by status, PATCH reply — approve/edit/send/skip/flag)
- [ ] T074 [US7] Create reply sender Edge Function in supabase/functions/engagement/send-reply/index.ts (posts approved reply to Meta Graph API as comment reply, updates EngagementReply status)
- [ ] T075 [US7] Create Engagement page in src/pages/Engagement.tsx (pending review queue, flagged items tab, sent replies history, per-post comment thread view)

**Checkpoint**: Comments detected, sentiment classified, witty replies generated, manual review queue functional, approved replies posted.

---

## Phase 10: User Story 8 — Multi-Channel Expansion (Priority: P3)

**Goal**: Support adding social media channels beyond Facebook (Instagram, LinkedIn, TikTok) with platform-specific content adaptation.

**Independent Test**: Add Instagram as a second channel, verify content generation adapts to Instagram formats (Reels, Stories, carousel), verify channel selection in campaign wizard.

### Implementation for User Story 8

- [ ] T076 [P] [US8] Create platform-specific content format configs in src/lib/platform-formats.ts (Facebook: post + link + carousel; Instagram: feed post + carousel + Stories + Reels; LinkedIn: post + article; TikTok: video description — aspect ratios, character limits, hashtag limits per platform)
- [ ] T077 [P] [US8] Create ChannelSelector component in src/components/channels/ChannelSelector.tsx (multi-select channels for campaign, shows platform icons, format requirements per platform)
- [ ] T078 [US8] Update generate-content Edge Function in supabase/functions/generate-content/index.ts to accept platform parameter and adapt DEPTH method output to platform-specific formats (character limits, hashtag strategies, CTA styles)
- [ ] T079 [US8] Update generate-creatives Edge Function in supabase/functions/generate-creatives/index.ts to generate platform-specific aspect ratios (1:1 Instagram feed, 9:16 Stories/Reels, 16:9 Facebook/LinkedIn)
- [ ] T080 [US8] Update CampaignWizard in src/components/campaigns/CampaignWizard.tsx to include ChannelSelector step with platform-specific content preview
- [ ] T081 [US8] Update publish Edge Function in supabase/functions/publish/index.ts to route publishing to correct platform API based on ChannelAccount.platform (Instagram Graph API, LinkedIn API placeholder, TikTok placeholder)

**Checkpoint**: Multiple channels configurable, content adapts to platform formats, campaign wizard supports multi-channel selection.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Performance, security, accessibility, and final quality pass

- [ ] T082 [P] Add loading skeletons to all pages in src/components/ui/Skeleton.tsx (dashboard metric cards, campaign list, calendar, content grid)
- [ ] T083 [P] Add empty states to all list views in src/components/ui/EmptyState.tsx (no campaigns, no channels connected, no segments imported)
- [ ] T084 [P] Add error boundary and toast notifications in src/components/ui/ErrorBoundary.tsx and src/components/ui/Toaster.tsx
- [ ] T085 Implement responsive layout breakpoints across all pages (mobile sidebar → hamburger menu, stack metric cards vertically, full-width calendar on mobile)
- [ ] T086 Add keyboard navigation and focus management to CampaignWizard, ContentReview, and CreativeGallery components
- [ ] T087 [P] Add ARIA labels and roles to dashboard widgets, calendar events, and interactive components per WCAG AA
- [ ] T088 [P] Implement dark mode and high-contrast mode using design system tokens across all components
- [ ] T089 Add budget reset cron Edge Function in supabase/functions/cron/budget-reset/index.ts (daily: reset daily budgets; check weekly/monthly period boundaries)
- [ ] T090 Add daily Shopify sync cron Edge Function in supabase/functions/cron/shopify-sync/index.ts (calls sync-shopify function, marks out-of-stock products)
- [ ] T091 Add weekly performance summary cron Edge Function in supabase/functions/cron/weekly-summary/index.ts (generates AI summary of all campaign performance, stores as PerformanceSnapshot)
- [ ] T092 Security hardening: validate all webhook signatures (Shopify HMAC, Meta X-Hub-Signature-256), sanitise user inputs, ensure API keys are in Supabase Vault only
- [ ] T092b Create API client retry wrapper in src/lib/api-retry.ts (exponential backoff with jitter for Meta, Shopify, Klaviyo, WeatherAPI, PredictHQ calls; max 3 retries; alert owner if retries exhausted; apply to all Edge Functions making external API calls)
- [ ] T093 Run quickstart.md validation: follow all steps in specs/001-social-media-wizard/quickstart.md from scratch, fix any discrepancies

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 Dashboard (Phase 3)**: Depends on Phase 2 only — MVP
- **US2 Content/DEPTH (Phase 4)**: Depends on Phase 2 only — can run parallel with US1
- **US3 Creatives (Phase 5)**: Depends on Phase 2 only — can run parallel with US1/US2
- **US4 Scheduling (Phase 6)**: Depends on Phase 2; benefits from US2 (content generation) being complete
- **US5 Segments (Phase 7)**: Depends on Phase 2; integrates with US2 (campaign wizard update)
- **US6 Publishing (Phase 8)**: Depends on Phase 2; benefits from US2 (content to publish) and US3 (creatives to publish)
- **US7 Engagement (Phase 9)**: Depends on US6 (published posts to monitor)
- **US8 Multi-Channel (Phase 10)**: Depends on US6 (existing publish infrastructure to extend)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
  ├── US1 (Dashboard)      ─── independent, MVP
  ├── US2 (Content/DEPTH)  ─── independent
  ├── US3 (Creatives)      ─── independent
  ├── US4 (Scheduling)     ─── benefits from US2
  ├── US5 (Segments)       ─── integrates with US2
  ├── US6 (Publishing)     ─── benefits from US2 + US3
  │     ├── US7 (Engagement) ─── requires US6
  │     └── US8 (Multi-Channel) ─── requires US6
  └── Phase 11 (Polish)
```

### Within Each User Story

- Models/types before services
- Edge Functions before frontend components that call them
- Core implementation before integration with other stories
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006 can all run in parallel
- **Phase 2**: T010, T011, T012 in parallel; T015, T016 in parallel (after T007-T009)
- **Phase 3 (US1)**: T018, T019, T020 in parallel; T023, T024 in parallel
- **Phase 4 (US2)**: T031, T032 in parallel
- **Phase 5 (US3)**: T038, T039, T040 in parallel; T043, T044 in parallel
- **Phase 6 (US4)**: T045, T046, T047 in parallel
- **Phase 7 (US5)**: T052, T053 in parallel
- **Phase 8 (US6)**: T059, T060, T061 in parallel
- **Phase 9 (US7)**: T070, T071 in parallel
- **Phase 10 (US8)**: T076, T077 in parallel
- **Phase 11**: T082, T083, T084 in parallel; T087, T088 in parallel
- **Cross-phase**: US1, US2, US3 can all start simultaneously after Phase 2

---

## Parallel Example: User Story 1

```bash
# Launch all dashboard components in parallel:
Task: T018 "Create MetricCard in src/components/dashboard/MetricCard.tsx"
Task: T019 "Create PerformanceChart in src/components/dashboard/PerformanceChart.tsx"
Task: T020 "Create CampaignStatusBadge in src/components/campaigns/CampaignStatusBadge.tsx"

# Then launch calendar components in parallel:
Task: T023 "Create CalendarView in src/components/calendar/CalendarView.tsx"
Task: T024 "Create TimelineView in src/components/calendar/TimelineView.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Dashboard + Calendar)
4. **STOP and VALIDATE**: Dashboard shows metrics, calendar shows campaigns
5. Deploy to Vercel for review

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Dashboard) → Test → Deploy (MVP!)
3. US2 (Content/DEPTH) + US3 (Creatives) → Test → Deploy (content creation working)
4. US4 (Scheduling) + US5 (Segments) → Test → Deploy (smart automation)
5. US6 (Publishing) → Test → Deploy (Facebook live!)
6. US7 (Engagement) + US8 (Multi-Channel) → Test → Deploy (full automation)
7. Polish → Final deploy

### Solo Developer Strategy (Recommended for Paul)

1. Complete Setup + Foundational (Phases 1-2)
2. Work through stories sequentially: US1 → US2 → US3 → US6 → US4 → US5 → US7 → US8
   - Note: US6 (Publishing) moved before US4/US5 because it enables US7 and US8
3. Polish after core stories complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 99
