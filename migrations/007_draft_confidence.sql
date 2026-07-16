-- Applied 2026-07-16. In draft mode a human reviews every reply before it is
-- sent, so a draft is now saved even when the model is unsure: an unsure draft
-- is still a useful starting point to edit. Record how sure the model was so
-- the reviewer sees a warning instead of a one-click send on a shaky answer.
--   1 = model reported confident, 0 = model reported unsure.

ALTER TABLE qa_log ADD COLUMN draft_sure INTEGER;
