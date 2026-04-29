-- 022_channel_refresh_token.sql
-- Add refresh_token to channel_accounts. Required for Google OAuth (YouTube
-- + Google Ads) so we can transparently refresh the 1-hour access token.

ALTER TABLE channel_accounts
  ADD COLUMN IF NOT EXISTS refresh_token TEXT;
