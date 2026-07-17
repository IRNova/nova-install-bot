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
  card_msg_id   INTEGER,                 -- the card this row's message belongs to (self for cards)
  replied       INTEGER DEFAULT 0,       -- 1 once an admin's reply was delivered
  qa_id         INTEGER,                 -- qa_log row this card carries (answer capture)
  created_at    TEXT DEFAULT (datetime('now'))
);

-- Every support question and its answer (human or AI). Feeds the AI
-- auto-answer knowledge pack and the FAQ suggester.
CREATE TABLE IF NOT EXISTS qa_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,
  lang        TEXT DEFAULT 'en',
  question    TEXT NOT NULL,
  answer      TEXT,                        -- null until answered
  source      TEXT,                        -- 'ai' | 'human' | 'approved' (AI draft a human sent)
  draft       TEXT,                        -- AI-drafted reply awaiting review (draft mode)
  draft_sure  INTEGER,                     -- 1 = model was confident, 0 = unsure, warn the reviewer
  resolved    INTEGER DEFAULT 0,           -- 1 when the user tapped "Solved"
  created_at  TEXT DEFAULT (datetime('now')),
  answered_at TEXT
);

-- What the AI spends per UTC day, so the panel can show it beside the switch.
CREATE TABLE IF NOT EXISTS ai_usage (
  day     TEXT PRIMARY KEY,   -- UTC date, YYYY-MM-DD
  calls   INTEGER DEFAULT 0,  -- successful model calls
  tokens  INTEGER DEFAULT 0,  -- total tokens (prompt + completion) when reported
  blocked INTEGER DEFAULT 0   -- calls refused because the allowance was spent
);

-- Seed default config.
INSERT OR IGNORE INTO config (key, value) VALUES
  ('welcome', ''),
  ('contact_group_id', ''),
  ('contact_enabled', '1'),
  ('faq_enabled', '1'),
  ('join_required', '1'),
  ('join_channel', 'irnova_proxy'),
  ('support_text', ''),
  ('support_links', ''),
  ('welcome_image', 'https://nova-install-bot.bitter-flower-1b15.workers.dev/banner.jpg'),
  ('ai_enabled', '1'),
  ('ai_mode', 'draft'),
  ('ai_model', 'claude-opus-4-8');
