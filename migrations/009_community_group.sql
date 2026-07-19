-- Applied 2026-07-17. The bot can now moderate the public community group
-- (separate from the admin contact group): a channel-membership gate, and a
-- nightly cleanup of the day's chatter that keeps channel forwards.
--
-- Telegram limits the cleanup: a bot can only delete messages it has seen and
-- logged, and nothing older than 48 hours. So we log every community message
-- as it arrives and the nightly sweep deletes the recent, non-kept ones.

CREATE TABLE IF NOT EXISTS group_messages (
  chat_id    TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  ts         INTEGER NOT NULL,   -- unix ms, for the 48h window and pruning
  keep       INTEGER DEFAULT 0,  -- 1 = channel forward, never swept
  PRIMARY KEY (chat_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_group_messages_ts ON group_messages (ts);

-- community_group_id : chat id of the public group (empty = feature off)
-- community_gate     : '1' delete non-channel-members' messages until they join
-- community_cleanup  : '1' run the nightly sweep
INSERT OR IGNORE INTO config (key, value) VALUES ('community_group_id', '');
INSERT OR IGNORE INTO config (key, value) VALUES ('community_gate', '1');
INSERT OR IGNORE INTO config (key, value) VALUES ('community_cleanup', '0');
