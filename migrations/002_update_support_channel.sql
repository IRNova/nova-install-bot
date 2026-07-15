-- Applied 2026-07-14. Adds columns/config for: channel-membership gate,
-- Support us, and the "Replied" state on contact cards. Safe + additive.

ALTER TABLE contact_map ADD COLUMN card_msg_id INTEGER;
ALTER TABLE contact_map ADD COLUMN replied INTEGER DEFAULT 0;

INSERT OR IGNORE INTO config (key, value) VALUES
  ('join_required', '1'),
  ('join_channel', 'irnova_proxy'),
  ('support_text', ''),
  ('support_links', '');
