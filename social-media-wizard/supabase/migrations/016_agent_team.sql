-- 016_agent_team.sql
-- Agent Workforce: a co-working team of three Claude-powered specialists
-- (Social Media Expert, CRO Expert, Acquisition Expert) sharing a team channel
-- with the boss (the app user). Schedules + on-demand + cross-agent mentions.

-- 1. Per-agent persona + editable settings
CREATE TABLE IF NOT EXISTS agent_settings (
  agent_key TEXT PRIMARY KEY
    CHECK (agent_key IN ('social_media','cro','acquisition')),
  display_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  custom_rules TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Per-template prompt + optional cron schedule
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key TEXT NOT NULL
    CHECK (agent_key IN ('social_media','cro','acquisition')),
  template_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  custom_rules TEXT,
  cron_expr TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_key, template_key)
);
CREATE INDEX IF NOT EXISTS agent_templates_active_cron_idx
  ON agent_templates (is_active, cron_expr)
  WHERE cron_expr IS NOT NULL;

-- 3. The team channel itself
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('boss','agent','system')),
  agent_key TEXT CHECK (agent_key IN ('social_media','cro','acquisition')),
  content TEXT NOT NULL,
  data_attachment JSONB,
  parent_id UUID REFERENCES team_messages(id) ON DELETE CASCADE,
  mentions TEXT[] NOT NULL DEFAULT '{}',
  template_key TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'boss'
    CHECK (triggered_by IN ('boss','agent','schedule','manual_template')),
  hop INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'complete'
    CHECK (status IN ('pending','complete','error')),
  error TEXT,
  ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS team_messages_created_idx
  ON team_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS team_messages_thread_idx
  ON team_messages (parent_id, created_at);

-- 4. Daily / monthly run accounting (mirrors search_usage pattern)
CREATE TABLE IF NOT EXISTS agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agent_key TEXT NOT NULL,
  trigger TEXT NOT NULL,
  template_key TEXT,
  ms INT,
  estimated_cost_usd NUMERIC(10,4)
);
CREATE INDEX IF NOT EXISTS agent_usage_used_at_idx
  ON agent_usage (used_at DESC);

-- 5. RLS — single owner
ALTER TABLE agent_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_usage     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all_agent_settings"
  ON agent_settings  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_agent_templates"
  ON agent_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_team_messages"
  ON team_messages   FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "owner_all_agent_usage"
  ON agent_usage     FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 6. updated_at triggers
CREATE OR REPLACE FUNCTION set_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_settings_set_updated_at ON agent_settings;
CREATE TRIGGER agent_settings_set_updated_at
  BEFORE UPDATE ON agent_settings
  FOR EACH ROW EXECUTE FUNCTION set_agent_updated_at();

DROP TRIGGER IF EXISTS agent_templates_set_updated_at ON agent_templates;
CREATE TRIGGER agent_templates_set_updated_at
  BEFORE UPDATE ON agent_templates
  FOR EACH ROW EXECUTE FUNCTION set_agent_updated_at();

-- =============================================================
-- Seed: agent_settings (3 rows)
-- =============================================================

INSERT INTO agent_settings (agent_key, display_name, system_prompt) VALUES
('social_media', 'Social Media Expert',
'You are the Social Media Expert on a small team running social and ecommerce for an independent UK shirt brand. You read post-level metrics across Facebook, Instagram, LinkedIn, TikTok and call out what is working in voice, format, channel, audience. You speak plainly, reference real numbers, and suggest one specific change per reply. You can @cro if checkout/conversion is the limiter, or @acquisition if the question is really about who is buying. Reply in 2–3 short paragraphs. No bullet lists. Reference specific numbers. If data is thin, say so plainly.'),
('cro', 'CRO Expert',
'You are the CRO Expert on a small team running social and ecommerce for an independent UK shirt brand. You watch the operational sales path — clicks → product page → cart → checkout → conversion — and call out what is working and what is broken. Where conversion data is not wired yet, you say so plainly and analyse leading indicators (CTR, click-to-product, stock-outs, paid-vs-organic mix). You can @social if creative is the limiter, or @acquisition if the right buyers are not being reached. Reply in 2–3 short paragraphs. No bullet lists. Reference specific numbers. If data is thin, say so plainly.'),
('acquisition', 'Acquisition Expert',
'You are the Acquisition Expert on a small team running social and ecommerce for an independent UK shirt brand. You think about who is buying, who is not, who used to, and who could. You read customer segments, channel mix, and campaign reach to make calls about acquisition cost, audience expansion, and reactivation. You can @social if creative is the limiter, or @cro if the funnel is leaking. Reply in 2–3 short paragraphs. No bullet lists. Reference specific numbers. If data is thin, say so plainly.')
ON CONFLICT (agent_key) DO NOTHING;

-- =============================================================
-- Seed: agent_templates (30 rows = 10 per agent)
-- =============================================================

-- Social Media Expert
INSERT INTO agent_templates (agent_key, template_key, name, description, prompt_template, cron_expr) VALUES
('social_media','weekly_digest','Weekly social digest','One-paragraph summary of the past 7 days across all channels.','Summarise the last 7 days of social posts. Lead with what platform led on engagement and why. Call out one creative pattern that is showing up in winners. End with one specific change for next week.','0 8 * * 1'),
('social_media','top_creatives','Top creatives + why','Look at top 5 posts by engagement rate and explain the pattern.','Take the top 5 posts by engagement rate over the last 30 days. Reference each by platform and date. Explain the angle they share, if any. If they all share one CTA or hook, say so plainly. End with what to try next.',NULL),
('social_media','underperforming_channels','Underperforming channels','Channels with low engagement vs others.','Across the last 30 days, identify any channel whose engagement rate sits well below the others. Reference the gap as a number. Decide whether the issue is reach, format, or message and say which.',NULL),
('social_media','audience_overlap','Audience overlap','Are we reaching different people on different channels, or repeating ourselves?','Look at platform-by-platform performance and segment matches over the last 60 days. If channels look like they reach the same people, say so. If one channel is doing distinct work, name it.',NULL),
('social_media','posting_cadence','Optimal posting cadence','Day-of-week and time analysis.','Analyse posts by day of week. Call out the day(s) with the strongest engagement rate. If cadence is too thin or too dense, say so. End with one cadence change to try.',NULL),
('social_media','hashtag_effectiveness','Hashtag effectiveness','Are our hashtags helping?','Compare engagement rate of posts with and without each common hashtag over the last 60 days. Identify hashtags that look additive, ones that look neutral, and ones that look like noise.',NULL),
('social_media','tone_consistency','Tone-of-voice consistency','Are we sounding like Blake Mill?','Read a sample of recent posts and judge whether the voice is consistent. Call out any post that drifts (too generic, too sales-y, off-brand). End with one tone fix.',NULL),
('social_media','brand_vs_product','Brand vs product post ratio','How often are we selling vs building brand?','Categorise the last 30 days of posts as brand-led or product-led. Report the ratio. If too heavy on either side, say which way to rebalance.',NULL),
('social_media','format_comparison','Reels vs Stories vs static','Which format is pulling weight?','Compare engagement rate by format on Instagram and TikTok over the last 60 days. Pick the format that is paying off and the one that is not. Recommend a shift in mix.',NULL),
('social_media','competitive_angles','Competitive angle suggestions','Three angles to test next.','Looking at our last 60 days of posts, propose three angles we have not leaned into. Be specific to a UK menswear brand. One sentence per angle.',NULL);

-- CRO Expert
INSERT INTO agent_templates (agent_key, template_key, name, description, prompt_template, cron_expr) VALUES
('cro','funnel_breakdown','Funnel conversion breakdown','Where are we losing people?','Walk the funnel: impressions → clicks → product page → cart → checkout → purchase. Where data exists, give the rate. Where it does not, say which step is dark and what would unblock it.',NULL),
('cro','mobile_vs_desktop','Mobile vs desktop','Which device is healthier?','Compare conversion-relevant indicators on mobile vs desktop. If we cannot split device today, say so plainly and analyse total CTR as a leading indicator.',NULL),
('cro','new_vs_returning','New vs returning visitor','Are first-timers converting?','Compare campaign-level performance for first-time vs repeat audiences. If we cannot split, lean on segment data and call out which segments are pulling weight.',NULL),
('cro','product_vs_collection','Product page vs collection','Which page type is converting?','Click destinations split between product and collection pages. Recommend which to lean into for next paid campaign.',NULL),
('cro','checkout_abandonment','Checkout abandonment','Where do they drop?','Walk through the checkout abandonment pattern from available data. If we have no checkout instrumentation yet, recommend the single highest-leverage thing to add.',NULL),
('cro','stockout_impact','Stock-out impact','Are out-of-stock products hurting us?','Cross-reference shirt_products.stock_status against recent campaigns. If any campaign is featuring out-of-stock items, flag it. End with one fix.',NULL),
('cro','promo_cycle','Promotional cycle analysis','Do promos help or train discount-seeking?','Compare engagement and conversion across promotional vs full-price periods. Call out whether promos are pulling new buyers or discounting committed ones.',NULL),
('cro','email_to_purchase','Email-to-purchase health','Is email working as a closing channel?','Look at Klaviyo segments and recent campaigns that included email. Call out whether email is driving purchase or just impressions.',NULL),
('cro','page_speed','Page-speed flags','Anything slow showing up in CTR?','Look for posts where CTR is unexpectedly low for an otherwise strong creative — a possible page-speed signal. If we have no real page-speed data, say so plainly.',NULL),
('cro','wow_conversion','Conversion-rate week-on-week','Are we trending up or down?','Compare this week vs last week vs the prior 4-week average for any conversion-adjacent indicator we have. State the trend in plain English.','0 9 * * 5');

-- Acquisition Expert
INSERT INTO agent_templates (agent_key, template_key, name, description, prompt_template, cron_expr) VALUES
('acquisition','cac_vs_ltv','CAC vs LTV proxy','What is a customer worth right now?','Estimate effective CAC from campaign spend and conversion proxy. Compare to a reasonable LTV proxy if any segment data lets us estimate it. Be honest about what we cannot calculate.',NULL),
('acquisition','repeat_rate','Repeat purchase rate by cohort','Are repeat customers growing?','Repeat-purchase data is not synced yet. Use customer_segments.purchase_intent as a proxy and report what we can and cannot conclude.',NULL),
('acquisition','top_segments','Top-converting segments','Which segments are pulling their weight?','From customer_segments, identify segments with the highest member_count × purchase_intent product. Call out any segment that looks oversized but inactive.',NULL),
('acquisition','reactivation','Reactivation candidates','Who used to buy and stopped?','Look for segments tagged ‘lapsed’ or with low purchase_intent. Recommend whether reactivation is worth a campaign now or whether new acquisition is the better play.',NULL),
('acquisition','channel_efficiency','Channel acquisition efficiency','Which channel acquires the cheapest?','Compare cost-per-engagement across channels as a proxy for cost-per-new-buyer until conversion data is wired. Pick the most efficient and the least.',NULL),
('acquisition','email_growth','Email list growth','Is the list growing fast enough?','Look at Klaviyo segment member_count over time if available, or call out what we cannot see. Recommend one specific lead magnet or capture surface to test.',NULL),
('acquisition','referral_loyalty','Referral / loyalty opportunity','Should we be running a programme?','Given the segments we have and the brand’s positioning, judge whether a referral or loyalty programme is a good next bet. Be specific about the form it should take.',NULL),
('acquisition','seasonal_patterns','Seasonal acquisition patterns','When does acquisition spike?','Look at the last 365 days of post performance by month to infer when acquisition pressure pays off most. If data is too thin, say so.',NULL),
('acquisition','ltv_by_first_purchase','LTV by first-purchase product','Which entry product has the best long tail?','First-purchase data is not synced yet. Use shirt-level engagement as a proxy and recommend which product would make the strongest entry-tier offer.',NULL),
('acquisition','underserved_audience','Underserved audience expansion','Who else could be a Blake Mill customer?','Given current segments, propose one audience we are not actively targeting that would fit the brand. One sentence on why and one sentence on a test.',NULL);
