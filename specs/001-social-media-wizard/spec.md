# Feature Specification: Social Media Wizard

**Feature Branch**: `001-social-media-wizard`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "A fully automated social media application for Blake Mill that creates content, schedules posts, manages ad spend, and promotes shirts using Shopify product data, customer survey insights, Klaviyo integration, weather signals, and real-world events. Includes live performance dashboards, campaign calendars, AI-generated carousel creatives, and automated engagement replies."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Campaign Dashboard & Calendar (Priority: P1)

As the Blake Mill owner, I want to see a visual dashboard showing live performance metrics (impressions, clicks, spend, conversions) alongside a calendar/timeline view of previous, current, and upcoming campaigns so I can understand what is working at a glance without checking multiple platforms.

**Why this priority**: Without visibility into campaign performance and scheduling, all other automation is flying blind. This is the command centre that every other feature feeds into.

**Independent Test**: Can be fully tested by displaying mock campaign data in a dashboard with calendar view and verifying that metrics update, campaigns are visually distinguishable by status (past/active/upcoming), and the timeline is navigable.

**Acceptance Scenarios**:

1. **Given** campaigns exist across multiple date ranges, **When** I open the dashboard, **Then** I see live metrics (impressions, clicks, spend, conversions, ROI) and a calendar showing all campaigns colour-coded by status
2. **Given** a campaign is currently running, **When** I view its detail, **Then** I see real-time engagement data, spend against my defined budget limit, and an honest AI-generated performance rating
3. **Given** I want to see the timeline, **When** I switch to timeline view, **Then** I see campaigns laid out chronologically with visual indicators of overlap, gaps, and performance trends

---

### User Story 2 - Automated Content Creation Using the DEPTH Method (Priority: P1)

As the Blake Mill owner, I want the system to automatically generate high-performing social media content (copy, hashtags, calls-to-action) for each shirt using the DEPTH method — combining behavioural psychology, direct response copywriting, and data analysis perspectives — so that every post is optimised for engagement before I approve it.

**Why this priority**: Content quality directly determines engagement and sales. The DEPTH method ensures each piece of content is evaluated from multiple expert perspectives with measurable success targets.

**Independent Test**: Can be fully tested by selecting a shirt from Shopify inventory and generating content variants, verifying that each variant shows evidence of the DEPTH method (multiple perspectives, success metrics, context layers, task breakdown, and self-rating).

**Acceptance Scenarios**:

1. **Given** a shirt product exists in Shopify (e.g., "Violet Haze Short Sleeve Shirt"), **When** the system generates campaign content, **Then** it produces copy from three expert perspectives (behavioural psychologist, direct response copywriter, data analyst) with defined success metrics (target open rate, CTR, psychological triggers)
2. **Given** content has been generated, **When** I review it, **Then** each variant includes a self-rated score (1-10) on clarity, persuasion, actionability, and factual accuracy, with improvements applied for any dimension scoring below 8
3. **Given** the system identifies uncertain factual claims in generated content, **When** presenting the content for review, **Then** those claims are flagged as UNCERTAIN with explanations

---

### User Story 3 - AI-Generated Visual Creatives & Carousels (Priority: P1)

As the Blake Mill owner, I want the system to generate carousel images and ad creatives by combining real product photography from Shopify with bold, branded messaging so that I can run visually engaging campaigns without hiring a designer for every post.

**Why this priority**: Visual content drives social media engagement. Combining real product images with generated creative treatments (similar to the automated ad machine pattern) enables high-volume creative testing at scale.

**Independent Test**: Can be fully tested by selecting a shirt, fetching its Shopify product images, and generating a set of carousel slides with overlaid brand messaging, verifying image quality and brand consistency.

**Acceptance Scenarios**:

1. **Given** a shirt exists in Shopify with product images, **When** I trigger creative generation, **Then** the system fetches the real product images and produces carousel variants with bold typography, brand colours, and compelling messaging overlaid
2. **Given** multiple creative variants are generated, **When** I review them in a gallery, **Then** I can approve, reject, or request modifications before any are scheduled for posting
3. **Given** I approve a set of creatives, **When** they are scheduled, **Then** the correct image formats and aspect ratios are used for each target platform

---

### User Story 4 - Smart Scheduling with Weather, Events & Holidays (Priority: P2)

As the Blake Mill owner, I want the system to automatically schedule posts based on weather forecasts, public holidays, cultural events, and real-world happenings (gigs, sporting events, festivals) so that the right shirts are promoted at the right time to the right audience.

**Why this priority**: Context-aware scheduling transforms generic advertising into timely, relevant content that resonates. Promoting "Violet Haze" when the weather turns sunny or "Adore the Mess" when a Stone Roses event is announced creates natural engagement hooks.

**Independent Test**: Can be fully tested by configuring weather location and event sources, then verifying the system recommends shirt-to-moment matches (e.g., sunny forecast -> lightweight/bright shirts, music event -> culturally relevant designs).

**Acceptance Scenarios**:

1. **Given** a 7-day weather forecast shows warm weather approaching, **When** the scheduler runs, **Then** it prioritises lightweight and bright-coloured shirts (e.g., Violet Haze, Aqua Drift) with weather-appropriate messaging
2. **Given** a Stone Roses gig or related event is detected, **When** the scheduler runs, **Then** it targets Stone Roses fan communities with the "Adore the Mess" shirt, using culturally relevant copy and hashtags
3. **Given** a public holiday (e.g., Father's Day, Bank Holiday) is approaching, **When** the scheduler runs, **Then** it creates gift-oriented or occasion-specific campaigns with appropriate lead time
4. **Given** the British Lions rugby tour generates social buzz, **When** the scheduler detects this, **Then** it can promote relevant designs to rugby communities (leveraging the Rogue Club insight that sports-inspired designs should be subtle, not literal merchandise)

---

### User Story 5 - Customer Intelligence from Surveys & Klaviyo (Priority: P2)

As the Blake Mill owner, I want the system to use customer survey data (from blakemill-feedback.vercel.app) and Klaviyo customer segments to understand preferences, purchase intent, and style feedback so that campaigns target the right people with the right products.

**Why this priority**: Blake Mill has rich customer data (age ranges, style preferences, purchase intent, occasion preferences, specific feedback like "too bold" or "more subtle prints") that should directly inform which shirts are promoted to which segments.

**Independent Test**: Can be fully tested by importing the Spring 2026 survey CSV and verifying the system extracts actionable segments (e.g., "55-65, prefers subtle prints, buys for special occasions") and maps them to appropriate products.

**Acceptance Scenarios**:

1. **Given** survey data has been imported, **When** the system analyses it, **Then** it identifies customer segments by age range, style preference (bold vs. subtle), purchase occasion (everyday, special occasions, holiday/travel, work), and purchase intent
2. **Given** a customer segment prefers "more subtle prints," **When** generating campaigns for that segment, **Then** the system selects appropriate shirts (e.g., White Sateen variants, Goldenstone) and avoids overly bold designs
3. **Given** Klaviyo integration is active, **When** a campaign targets a segment, **Then** the system uses Klaviyo's email/SMS data to coordinate messaging across channels and avoid over-contacting customers

---

### User Story 6 - Facebook Publishing & Ad Spend Management (Priority: P2)

As the Blake Mill owner, I want the system to automatically publish approved content to Facebook, manage my ad spend within defined budget limits, and report on campaign performance so that I spend less while getting more traction.

**Why this priority**: Facebook is the primary current channel. Automating publishing and enforcing budget discipline prevents overspend while maintaining consistent presence.

**Independent Test**: Can be fully tested by connecting a Facebook Business account, setting a weekly budget cap, and verifying the system publishes approved posts, pauses spend when limits are reached, and reports actual vs. budgeted spend.

**Acceptance Scenarios**:

1. **Given** I have set a weekly ad spend limit, **When** spend approaches or reaches that limit, **Then** the system pauses ad delivery and notifies me
2. **Given** content has been approved, **When** the scheduled time arrives, **Then** the system publishes to Facebook with correct copy, images, targeting, and budget allocation
3. **Given** a campaign has been running for 48 hours, **When** I view its performance, **Then** I see an honest AI rating of performance including relevant comments, engagement metrics, and audience feedback extracted from the post

---

### User Story 7 - Automated Engagement & Witty Replies (Priority: P3)

As the Blake Mill owner, I want the system to automatically reply to comments and engagement on posts with witty, brand-appropriate humour and soft product nudges so that the brand stays active and approachable without me monitoring every comment.

**Why this priority**: Active engagement drives algorithm visibility and builds brand personality. Automated replies maintain presence during off-hours while keeping the Blake Mill tone — irreverent but never offensive.

**Independent Test**: Can be fully tested by simulating incoming comments on a post and verifying the system generates contextually appropriate, humorous replies that include soft product references where relevant.

**Acceptance Scenarios**:

1. **Given** a user comments on a post, **When** the auto-reply system processes it, **Then** it generates a witty, brand-appropriate response within the Blake Mill tone of voice
2. **Given** a comment expresses interest in a specific style or colour, **When** the system replies, **Then** it includes a soft nudge to a relevant shirt with a natural conversational tone (not a sales pitch)
3. **Given** a negative or inappropriate comment is received, **When** the system evaluates it, **Then** it flags it for manual review rather than auto-replying

---

### User Story 8 - Multi-Channel Expansion (Priority: P3)

As the Blake Mill owner, I want to be able to add additional social media channels and personal accounts beyond Facebook (e.g., Instagram, LinkedIn, TikTok) so that the system can grow with the business.

**Why this priority**: While Facebook is the starting point, the architecture must support additional channels. The Rogue Club WhatsApp conversations show that LinkedIn is already used for sharing, and Instagram is a natural fit for a visual product.

**Independent Test**: Can be fully tested by adding a second channel configuration (e.g., Instagram) and verifying the system adapts content formats and scheduling rules for the new platform.

**Acceptance Scenarios**:

1. **Given** I want to add Instagram as a channel, **When** I connect my account, **Then** the system appears in the channel list and content generation adapts to Instagram-specific formats (Reels, Stories, carousel posts)
2. **Given** multiple channels are configured, **When** a campaign is created, **Then** I can select which channels to include and the system generates platform-appropriate variants of the content

---

### Edge Cases

- What happens when Shopify product data is unavailable or a product is out of stock? The system should skip or flag out-of-stock items and never promote unavailable products.
- How does the system handle weather API downtime? Scheduling falls back to non-weather-dependent content.
- What happens when ad spend reaches the budget limit mid-campaign? The system pauses delivery immediately and notifies the owner.
- How does the system handle conflicting events (e.g., a sunny day coincides with a cultural event)? Priority rules determine which signal takes precedence, with manual override available.
- What happens when auto-reply encounters a language it cannot process? It flags for manual review.
- How does the system handle rate limiting from social platform APIs? It queues posts and retries with exponential backoff, alerting the owner if delays exceed 1 hour.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to Shopify to fetch current product catalogue including images, descriptions, pricing, and stock status
- **FR-002**: System MUST import and analyse customer survey data (CSV format) extracting segments by age, style preference, purchase intent, and occasion
- **FR-003**: System MUST integrate with Klaviyo for customer segment data and coordinated cross-channel messaging
- **FR-004**: System MUST generate social media content using the DEPTH method (Define Multiple Perspectives, Establish Success Metrics, Provide Context Layers, Task Breakdown, Human Feedback Loop)
- **FR-005**: System MUST generate visual carousel creatives by combining real Shopify product images with branded typography and messaging
- **FR-006**: System MUST fetch weather forecast data for Blake Mill's target geographic regions
- **FR-007**: System MUST detect relevant real-world events, gigs, holidays, and cultural moments that align with specific shirt themes
- **FR-008**: System MUST map shirts to contextual triggers (weather conditions, events, seasons, customer segments) via configurable rules
- **FR-009**: System MUST schedule and automatically publish approved content to connected social media platforms
- **FR-010**: System MUST enforce user-defined budget limits per channel, per campaign, and overall, pausing ad delivery when limits are reached
- **FR-011**: System MUST display a real-time dashboard with performance metrics (impressions, clicks, spend, conversions, ROI)
- **FR-012**: System MUST display campaigns in both calendar and timeline views with status indicators
- **FR-013**: System MUST provide an honest AI-generated performance rating for each campaign, incorporating engagement data, comments, and audience feedback
- **FR-014**: System MUST automatically generate contextually appropriate, witty replies to post comments with soft product nudges
- **FR-015**: System MUST flag negative, inappropriate, or ambiguous comments for manual review rather than auto-replying
- **FR-016**: System MUST support adding multiple social media channels and accounts with platform-specific content adaptation
- **FR-017**: System MUST present generated content (copy and visuals) for approval before publishing by default. However, the owner can pre-approve content templates and trigger rules so that matching campaigns (e.g., weather-triggered, event-triggered) auto-publish within defined guardrails (budget cap, approved shirt + copy style). Auto-published content is flagged for post-publish review.
- **FR-018**: System MUST never promote out-of-stock products
- **FR-019**: System MUST log all ad spend with date, campaign, channel, and amount for cost tracking
- **FR-020**: System MUST use existing Blake Mill design system tokens and components for its own UI

### Key Entities

- **Shirt Product**: A Blake Mill shirt with name, description, images, price, stock status, style attributes (bold/subtle, colour family), and contextual tags (e.g., "Stone Roses inspired", "summer weight")
- **Campaign**: A planned promotional effort with target shirts, audience segments, channels, schedule, budget, content variants, and performance metrics
- **Customer Segment**: A group of customers defined by survey responses (age, style preference, occasion, purchase intent) and/or Klaviyo data
- **Content Variant**: A generated piece of content (copy + visuals) for a specific platform, produced via the DEPTH method, with approval status and performance scores
- **Channel Account**: A connected social media platform account (Facebook, Instagram, LinkedIn, etc.) with platform-specific settings and API credentials
- **Contextual Trigger**: A weather condition, event, holiday, or cultural moment that activates a shirt-to-campaign mapping
- **Budget Rule**: A spending limit defined per channel, per campaign, or overall with alert thresholds and auto-pause behaviour
- **Engagement Reply**: An auto-generated response to a social media comment, with sentiment classification and escalation rules

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Time to create and schedule a complete campaign (content + visuals + targeting) is reduced from hours of manual work to under 15 minutes of review and approval
- **SC-002**: Ad spend stays within user-defined budget limits 100% of the time — no overspend events
- **SC-003**: Content engagement rate (likes, comments, shares per impression) improves by 25% compared to manually created posts over a 30-day period
- **SC-004**: At least 80% of auto-generated content variants score 8 or above on the DEPTH method self-assessment across all four dimensions (clarity, persuasion, actionability, factual accuracy)
- **SC-005**: Weather and event-triggered campaigns go live within 4 hours of the triggering condition being detected
- **SC-006**: 90% of post comments receive an appropriate auto-reply within 2 hours
- **SC-007**: Owner spends less than 30 minutes per day on social media management (down from current manual effort)
- **SC-008**: Customer survey insights are reflected in targeting — campaigns sent to "subtle print" preference segments never feature bold designs, and vice versa
- **SC-009**: Dashboard loads and displays current metrics within 3 seconds
- **SC-010**: System supports at least 2 social media channels simultaneously within 3 months of launch

## Clarifications

### Session 2026-04-11

- Q: Should all content require manual approval, or can trigger-based campaigns auto-publish? → A: Manual approval by default; pre-approved templates can auto-publish for trigger-based campaigns within guardrails.

## Assumptions

- Blake Mill has an active Shopify store with product data accessible via API or MCP
- Facebook Business/Meta API access is available for publishing and ad management
- A weather data provider is available for UK forecast data
- Klaviyo account exists with customer segments and API access
- The owner (Paul) is the sole approver of content — no multi-user approval workflow needed initially
- The existing Rogue Club WhatsApp group provides qualitative insight but is not a publishing channel
- Budget limits are set manually by the owner and can be adjusted at any time
- The DEPTH method self-rating is performed by AI and serves as a quality gate, not a guarantee of real-world performance
- Google Gemini or equivalent image generation API is available for carousel creative generation
- The Blake Mill brand tone is irreverent, witty, culturally aware, and never offensive — informed by the Rogue Club community interactions
