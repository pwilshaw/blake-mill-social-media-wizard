-- seed.sql: Default trigger templates and budget rules

-- Sample weather triggers
INSERT INTO contextual_triggers (name, trigger_type, conditions, matched_shirts, cooldown_hours) VALUES
  ('Sunny & Warm', 'weather', '{"temp_min": 20, "weather": "sunny"}', '{}', 48),
  ('Rainy Day', 'weather', '{"weather": "rain"}', '{}', 48),
  ('Cold Snap', 'weather', '{"temp_max": 5, "weather": "snow"}', '{}', 72);

-- Sample event triggers
INSERT INTO contextual_triggers (name, trigger_type, conditions, matched_shirts, cooldown_hours) VALUES
  ('Stone Roses Event', 'event', '{"keywords": ["stone roses", "ian brown", "madchester"]}', '{}', 168),
  ('Music Festival', 'event', '{"keywords": ["festival", "glastonbury", "reading", "leeds"]}', '{}', 72),
  ('Rugby Match', 'event', '{"keywords": ["rugby", "lions", "six nations"]}', '{}', 72);

-- Sample holiday triggers
INSERT INTO contextual_triggers (name, trigger_type, conditions, matched_shirts, cooldown_hours) VALUES
  ('Fathers Day', 'holiday', '{"holiday": "fathers_day", "lead_days": 14}', '{}', 336),
  ('Bank Holiday', 'holiday', '{"holiday": "bank_holiday", "lead_days": 7}', '{}', 168),
  ('Christmas', 'holiday', '{"holiday": "christmas", "lead_days": 30}', '{}', 720);

-- Default global budget rule (£50/week)
INSERT INTO budget_rules (scope, period, limit_amount, alert_threshold_pct, auto_pause, period_reset_at) VALUES
  ('global', 'weekly', 50.00, 80, true, now() + interval '7 days');
