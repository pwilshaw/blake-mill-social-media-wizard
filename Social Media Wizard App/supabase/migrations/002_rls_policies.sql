-- 002_rls_policies.sql
-- Single owner: allow all operations for authenticated user

ALTER TABLE shirt_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contextual_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_shirts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_logs ENABLE ROW LEVEL SECURITY;

-- Helper: single-owner policy for all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'shirt_products', 'content_templates', 'customer_segments',
      'contextual_triggers', 'channel_accounts', 'campaigns',
      'campaign_shirts', 'content_variants', 'creative_assets',
      'channel_posts', 'budget_rules', 'engagement_replies',
      'performance_snapshots', 'spend_logs'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "owner_all_%1$s" ON %1$I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END;
$$;
