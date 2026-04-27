-- 017_agent_dispatcher_cron.sql
-- Pg_cron schedule for the agent workforce dispatcher.
-- Fires every 5 minutes; the dispatcher checks which agent_templates have
-- a cron_expr that's due now and posts a fresh briefing to the team channel.

SELECT cron.schedule(
  'agent-dispatcher',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-agent-dispatcher',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );$$
);
