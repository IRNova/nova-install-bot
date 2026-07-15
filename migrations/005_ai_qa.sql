-- Applied 2026-07-15. AI support: log every support question and its answer
-- (human or AI) so the assistant can learn from past answers and the admin
-- panel can draft FAQs from real questions.

CREATE TABLE IF NOT EXISTS qa_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER,
  lang        TEXT DEFAULT 'en',
  question    TEXT NOT NULL,
  answer      TEXT,                        -- null until answered
  source      TEXT,                        -- 'ai' | 'human'
  resolved    INTEGER DEFAULT 0,           -- 1 when the user tapped "Solved"
  created_at  TEXT DEFAULT (datetime('now')),
  answered_at TEXT
);

-- Link an admin-group card back to the question it carries, so an admin's
-- reply is recorded as the answer.
ALTER TABLE contact_map ADD COLUMN qa_id INTEGER;

INSERT OR IGNORE INTO config (key, value) VALUES
  ('ai_enabled', '1'),
  ('ai_model', 'claude-opus-4-8');
