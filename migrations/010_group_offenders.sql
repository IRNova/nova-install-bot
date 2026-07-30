-- Profanity moderation: track how many times a community-group member tripped
-- the filter, so enforcement can escalate (warn -> mute -> ban). One row per
-- user. Kept separate from `users` because community members may never have
-- DMed the bot, so they have no `users` row.
CREATE TABLE IF NOT EXISTS group_offenders (
  user_id     INTEGER PRIMARY KEY,
  first_name  TEXT,
  username    TEXT,
  count       INTEGER DEFAULT 0,      -- total profanity strikes
  last_text   TEXT,                   -- last offending snippet (admin review)
  last_at     TEXT,                   -- ISO timestamp of the last strike
  muted_until INTEGER DEFAULT 0,      -- epoch ms the mute lifts (0 = not muted)
  status      TEXT DEFAULT 'active'   -- active | muted | banned
);
CREATE INDEX IF NOT EXISTS idx_offenders_last ON group_offenders(last_at DESC);
