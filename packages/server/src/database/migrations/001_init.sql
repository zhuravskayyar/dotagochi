CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Юзик',
  hunger INTEGER NOT NULL DEFAULT 100,
  happiness INTEGER NOT NULL DEFAULT 100,
  hero_level INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id TEXT PRIMARY KEY,
  feed_reminders INTEGER NOT NULL DEFAULT 1,
  play_reminders INTEGER NOT NULL DEFAULT 1
);
