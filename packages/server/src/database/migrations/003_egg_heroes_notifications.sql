ALTER TABLE pets ADD COLUMN hero_id INTEGER;
ALTER TABLE pets ADD COLUMN hero_slug TEXT;
ALTER TABLE pets ADD COLUMN hero_name TEXT;
ALTER TABLE pets ADD COLUMN life_stage TEXT NOT NULL DEFAULT 'adult';
ALTER TABLE pets ADD COLUMN stage_started_at_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pets ADD COLUMN hatched_at_ms INTEGER;
ALTER TABLE pets ADD COLUMN critical_since_ms INTEGER;
ALTER TABLE pets ADD COLUMN care_mistakes INTEGER NOT NULL DEFAULT 0;

UPDATE pets
SET hero_id = 14,
    hero_slug = 'pudge',
    hero_name = 'Pudge',
    life_stage = 'adult',
    stage_started_at_ms = CASE
      WHEN last_update_ms > 0 THEN last_update_ms
      ELSE CAST(strftime('%s', 'now') AS INTEGER) * 1000
    END,
    hatched_at_ms = CASE
      WHEN last_update_ms > 0 THEN last_update_ms
      ELSE CAST(strftime('%s', 'now') AS INTEGER) * 1000
    END
WHERE hero_id IS NULL;

ALTER TABLE notification_settings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE notification_settings ADD COLUMN critical_alerts INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS notification_events (
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  last_sent_ms INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind)
);
