-- 004_channel_accounts_unique.sql
-- Add unique constraint on platform + account_id for upsert support

CREATE UNIQUE INDEX IF NOT EXISTS channel_accounts_platform_account_id_key
  ON channel_accounts (platform, account_id);
