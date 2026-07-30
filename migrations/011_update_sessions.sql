-- Short-lived Cloudflare update sessions. The token is AES-GCM encrypted by
-- the Worker before it reaches D1 and is deleted before the update upload.
CREATE TABLE IF NOT EXISTS update_sessions (
  user_id       INTEGER PRIMARY KEY,
  chat_id       INTEGER NOT NULL,
  token_cipher  TEXT NOT NULL,
  token_iv      TEXT NOT NULL,
  workers_json  TEXT NOT NULL,
  expires_at    INTEGER NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_update_sessions_expires
  ON update_sessions(expires_at);

-- Remove any update contexts written by the older implementation, where the
-- short-lived token lived in the generic config JSON.
DELETE FROM config WHERE key LIKE 'upd_ctx_%';
