-- Applied 2026-07-16. Draft mode: the AI drafts a reply for every support
-- question but a human reviews and sends it (from the panel or the Telegram
-- group) until there is enough data to trust full automation.

ALTER TABLE qa_log ADD COLUMN draft TEXT;

-- ai_mode: 'draft' (AI drafts, human approves) or 'auto' (AI sends directly).
INSERT OR IGNORE INTO config (key, value) VALUES ('ai_mode', 'draft');
