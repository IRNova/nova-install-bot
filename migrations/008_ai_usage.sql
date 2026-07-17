-- Applied 2026-07-17. Track what the AI actually spends, per UTC day, so the
-- panel can show it next to the on/off switch instead of the operator finding
-- out from a silent 4006 hours later.
--
-- Measured 2026-07-16 on llama-3.3-70b-fp8-fast: 10,415 neurons over 92 calls
-- and ~507,000 tokens, i.e. about 113 neurons/call and ~20.5 neurons per 1,000
-- tokens. The free allowance is 10,000 neurons/day, so roughly 88 answers.

CREATE TABLE IF NOT EXISTS ai_usage (
  day     TEXT PRIMARY KEY,   -- UTC date, YYYY-MM-DD
  calls   INTEGER DEFAULT 0,  -- successful model calls
  tokens  INTEGER DEFAULT 0,  -- total tokens (prompt + completion) when reported
  blocked INTEGER DEFAULT 0   -- calls refused because the allowance was spent
);
