-- 019_agent_avatars.sql
-- Custom avatar image per agent. Files live in the existing brand-assets
-- Storage bucket under the agent-avatars/ prefix; this column holds the
-- public URL.

ALTER TABLE agent_settings
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
