-- Nova Install Bot — D1 schema

-- Everyone who has interacted with the bot (for stats + broadcast).
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,       -- Telegram user id
  first_name  TEXT,
  username    TEXT,
  lang        TEXT DEFAULT 'en',
  installs    INTEGER DEFAULT 0,         -- panels this user built via the bot
  blocked     INTEGER DEFAULT 0,         -- 1 if the user blocked the bot (broadcast skips them)
  banned      INTEGER DEFAULT 0,         -- 1 if an admin banned this user (can't use the bot)
  first_seen  TEXT DEFAULT (datetime('now')),
  last_seen   TEXT DEFAULT (datetime('now'))
);

-- FAQ entries, shown as a tappable list. Ordered by position.
CREATE TABLE IF NOT EXISTS faq (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  position  INTEGER DEFAULT 0,
  question  TEXT NOT NULL,
  answer    TEXT NOT NULL,
  enabled   INTEGER DEFAULT 1
);

-- Free-form menu sections the admin can add (title + body + optional button).
CREATE TABLE IF NOT EXISTS sections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  position     INTEGER DEFAULT 0,
  title        TEXT NOT NULL,            -- shown on the menu button
  body         TEXT NOT NULL,            -- message shown when tapped (HTML)
  button_text  TEXT,                     -- optional inline link button
  button_url   TEXT,
  enabled      INTEGER DEFAULT 1
);

-- Key/value config (welcome text, contact group id, etc.).
CREATE TABLE IF NOT EXISTS config (
  key    TEXT PRIMARY KEY,
  value  TEXT
);

-- Maps a message forwarded into the admin group back to the user who sent it,
-- so an admin's reply in the group is relayed to the right person.
CREATE TABLE IF NOT EXISTS contact_map (
  group_msg_id  INTEGER PRIMARY KEY,     -- message id of the copy in the admin group
  user_id       INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Seed default config.
INSERT OR IGNORE INTO config (key, value) VALUES
  ('welcome', ''),
  ('contact_group_id', ''),
  ('contact_enabled', '1'),
  ('faq_enabled', '1');
