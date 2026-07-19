// D1 helpers and config access.

export async function getConfig(env, key, fallback = "") {
  const row = await env.DB.prepare("SELECT value FROM config WHERE key = ?").bind(key).first();
  return row && row.value != null ? row.value : fallback;
}

export async function setConfig(env, key, value) {
  await env.DB.prepare(
    "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).bind(key, String(value ?? "")).run();
}

export async function delConfig(env, key) {
  await env.DB.prepare("DELETE FROM config WHERE key = ?").bind(key).run();
}

// Record or refresh a user; used for stats and broadcast reach. On first sight
// we seed `lang` from Telegram's language_code; a later explicit choice wins and
// is preserved (ON CONFLICT does not touch lang).
export async function touchUser(env, from, initialLang) {
  if (!from || from.is_bot) return;
  await env.DB.prepare(
    `INSERT INTO users (id, first_name, username, lang, last_seen)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       first_name = excluded.first_name,
       username   = excluded.username,
       last_seen  = datetime('now'),
       blocked    = 0`
  ).bind(from.id, from.first_name || "", from.username || "", initialLang || "en").run();
}

export async function bumpInstalls(env, userId) {
  await env.DB.prepare("UPDATE users SET installs = installs + 1 WHERE id = ?").bind(userId).run();
}

export async function getUserLang(env, userId) {
  const row = await env.DB.prepare("SELECT lang FROM users WHERE id = ?").bind(userId).first();
  return row && row.lang ? row.lang : null;
}

export async function setUserLang(env, userId, lang) {
  await env.DB.prepare("UPDATE users SET lang = ? WHERE id = ?").bind(lang, userId).run();
}

export async function markBlocked(env, userId) {
  await env.DB.prepare("UPDATE users SET blocked = 1 WHERE id = ?").bind(userId).run();
}

// Admin ban / unban. banUser also creates a stub row if the id was never seen,
// so an admin can pre-emptively block an id (e.g. from the contact group).
export async function setBanned(env, userId, banned) {
  await env.DB.prepare(
    `INSERT INTO users (id, banned) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET banned = excluded.banned`
  ).bind(userId, banned ? 1 : 0).run();
}

export async function isBanned(env, userId) {
  const row = await env.DB.prepare("SELECT banned FROM users WHERE id = ?").bind(userId).first();
  return !!(row && row.banned);
}

export async function listUsers(env, { search = "", limit = 60 } = {}) {
  let q = "SELECT id, first_name, username, lang, installs, banned, last_seen FROM users";
  const binds = [];
  if (search) {
    q += " WHERE CAST(id AS TEXT) LIKE ? OR first_name LIKE ? OR username LIKE ?";
    const like = "%" + search + "%";
    binds.push(like, like, like);
  }
  q += " ORDER BY banned DESC, last_seen DESC LIMIT ?";
  binds.push(limit);
  const { results } = await env.DB.prepare(q).bind(...binds).all();
  return results || [];
}

export async function listFaq(env, onlyEnabled = true) {
  const q = "SELECT * FROM faq" + (onlyEnabled ? " WHERE enabled = 1" : "") +
    " ORDER BY position ASC, id ASC";
  const { results } = await env.DB.prepare(q).all();
  return results || [];
}

export async function getFaq(env, id) {
  return env.DB.prepare("SELECT * FROM faq WHERE id = ?").bind(id).first();
}

export async function listSections(env, onlyEnabled = true) {
  const q = "SELECT * FROM sections" + (onlyEnabled ? " WHERE enabled = 1" : "") +
    " ORDER BY position ASC, id ASC";
  const { results } = await env.DB.prepare(q).all();
  return results || [];
}

export async function getSection(env, id) {
  return env.DB.prepare("SELECT * FROM sections WHERE id = ?").bind(id).first();
}

// ── Q&A log (support questions + answers, feeds AI and FAQ suggestions) ─────

export async function logQuestion(env, userId, lang, question) {
  const r = await env.DB.prepare(
    "INSERT INTO qa_log (user_id, lang, question) VALUES (?, ?, ?) RETURNING id"
  ).bind(userId, lang || "en", question).first();
  return r ? r.id : null;
}

export async function setQaAnswer(env, qaId, answer, source) {
  if (!qaId) return;
  await env.DB.prepare(
    "UPDATE qa_log SET answer = ?, source = ?, answered_at = datetime('now') WHERE id = ?"
  ).bind(answer, source, qaId).run();
}

// Record an admin's group reply as the (human) answer to the question the
// card carries. A human answer always wins over an earlier AI answer.
// source defaults to 'human' (a real answer the KB should learn from). Pass
// 'photo' for a captionless image reply: it clears the question from the
// Waiting inbox but stays out of the knowledge pack, which only pulls
// human/approved answers.
export async function setQaAnswerByCard(env, cardMsgId, answer, source = "human") {
  await env.DB.prepare(
    `UPDATE qa_log SET answer = ?, source = ?, answered_at = datetime('now')
     WHERE id = (SELECT qa_id FROM contact_map WHERE group_msg_id = ?)`
  ).bind(answer, source, cardMsgId).run();
}

export async function setQaDraft(env, qaId, draft, sure) {
  if (!qaId) return;
  await env.DB.prepare("UPDATE qa_log SET draft = ?, draft_sure = ? WHERE id = ?")
    .bind(draft, sure ? 1 : 0, qaId).run();
}

export async function markQaResolved(env, qaId) {
  await env.DB.prepare("UPDATE qa_log SET resolved = 1 WHERE id = ?").bind(qaId).run();
}

// ── AI spend ────────────────────────────────────────────────────────────────

// Neurons are not reported per call, so we estimate from tokens, which are.
// Measured 2026-07-16 on llama-3.3-70b-fp8-fast: 10,415 neurons over ~507k
// tokens = about 0.0205 neurons/token (and 113 neurons/call on the old pack).
// Estimating from tokens self-corrects when the pack size changes, e.g. after
// retrieval shrank it; the per-call figure is only the fallback when a response
// does not report token usage.
export const NEURONS_PER_TOKEN = 10415 / 507000;
export const NEURONS_PER_CALL = 113;
export const FREE_NEURONS_PER_DAY = 10000;

const utcDay = () => new Date().toISOString().slice(0, 10);

export async function bumpAiUsage(env, { tokens = 0, blocked = false } = {}) {
  const day = utcDay();
  await env.DB.prepare(
    `INSERT INTO ai_usage (day, calls, tokens, blocked) VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       calls = calls + excluded.calls,
       tokens = tokens + excluded.tokens,
       blocked = blocked + excluded.blocked`
  ).bind(day, blocked ? 0 : 1, tokens, blocked ? 1 : 0).run();
}

// Today's AI spend, shaped for the panel. `pct` is share of the free daily
// allowance; `blocked` > 0 means the allowance ran out and users got no drafts.
export async function aiUsageToday(env) {
  const r = await env.DB.prepare("SELECT calls, tokens, blocked FROM ai_usage WHERE day = ?")
    .bind(utcDay()).first().catch(() => null);
  const calls = (r && r.calls) || 0;
  const tokens = (r && r.tokens) || 0;
  // Prefer the token-based estimate; fall back to per-call when tokens are 0
  // (a response that did not report usage).
  const neurons = tokens > 0
    ? Math.round(tokens * NEURONS_PER_TOKEN)
    : calls * NEURONS_PER_CALL;
  // Live capacity: how many more answers today's average call leaves room for.
  const perCall = calls > 0 ? neurons / calls : NEURONS_PER_CALL;
  return {
    calls,
    tokens,
    blocked: (r && r.blocked) || 0,
    neurons,
    freeNeurons: FREE_NEURONS_PER_DAY,
    freeCalls: Math.max(calls, Math.floor(FREE_NEURONS_PER_DAY / perCall)),
    pct: Math.min(100, Math.round((neurons / FREE_NEURONS_PER_DAY) * 100)),
  };
}

export async function getQa(env, qaId) {
  return env.DB.prepare("SELECT * FROM qa_log WHERE id = ?").bind(qaId).first();
}

// Recent answered exchanges, most recent first. Human answers and
// human-approved AI drafts are the gold standard for the AI knowledge pack;
// pass sources to filter.
export async function listAnsweredQa(env, { sources = null, limit = 40 } = {}) {
  let q = "SELECT question, answer, lang, source FROM qa_log WHERE answer IS NOT NULL AND answer != ''";
  const binds = [];
  if (sources && sources.length) {
    q += ` AND source IN (${sources.map(() => "?").join(",")})`;
    binds.push(...sources);
  }
  q += " ORDER BY id DESC LIMIT ?";
  binds.push(limit);
  const { results } = await env.DB.prepare(q).bind(...binds).all();
  return results || [];
}

// Every unanswered question, newest first, with its draft, for the Waiting
// inbox. Unlike the Overview feed (last 8, any status) this is the full backlog
// the team still has to clear. Question text is untrusted; the panel escapes it.
export async function listWaitingQa(env, { limit = 200 } = {}) {
  const { results } = await env.DB.prepare(
    "SELECT id, question, lang, draft, draft_sure, created_at FROM qa_log " +
    "WHERE answer IS NULL OR answer = '' ORDER BY id DESC LIMIT ?"
  ).bind(limit).all().catch(() => ({ results: [] }));
  return (results || []).map((r) => ({
    id: r.id,
    question: String(r.question || "").slice(0, 2000),
    lang: r.lang || "en",
    status: "waiting",
    draft: r.draft ? String(r.draft) : "",
    draft_sure: r.draft_sure === 1,
    created_at: r.created_at,
  }));
}

// Everything the Overview pane needs in one payload: the base counters, support
// pipeline counts, a 14-day activity series, and the latest support questions.
// qa_log may not exist until migration 005 runs; every qa query degrades to zero.
export async function overview(env) {
  const base = await stats(env);
  const waiting = await env.DB.prepare(
    "SELECT COUNT(*) n FROM qa_log WHERE answer IS NULL OR answer = ''").first().catch(() => ({ n: 0 }));
  const human = await env.DB.prepare(
    "SELECT COUNT(*) n FROM qa_log WHERE source IN ('human','approved')").first().catch(() => ({ n: 0 }));

  // Per-day counts for the last 14 days (UTC). Two tiny GROUP BY scans; the
  // date window keeps them cheap even as the tables grow.
  const dayRows = async (sql) => {
    const { results } = await env.DB.prepare(sql).all().catch(() => ({ results: [] }));
    const map = {};
    for (const r of results || []) map[r.d] = r.n;
    return map;
  };
  const newUsers = await dayRows(
    "SELECT date(first_seen) d, COUNT(*) n FROM users WHERE first_seen >= date('now','-13 day') GROUP BY d");
  const newQuestions = await dayRows(
    "SELECT date(created_at) d, COUNT(*) n FROM qa_log WHERE created_at >= date('now','-13 day') GROUP BY d");
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    days.push({ d, users: newUsers[d] || 0, questions: newQuestions[d] || 0 });
  }

  // Latest support questions, newest first. Questions are untrusted user text;
  // ship a trimmed snippet only, the panel escapes it before rendering.
  const { results: recentRows } = await env.DB.prepare(
    "SELECT id, question, answer, lang, source, draft, draft_sure, created_at FROM qa_log ORDER BY id DESC LIMIT 8"
  ).all().catch(() => ({ results: [] }));
  const recent = (recentRows || []).map((r) => {
    const answered = !!(r.answer && r.answer !== "");
    return {
      id: r.id,
      question: String(r.question || "").slice(0, 200),
      lang: r.lang || "en",
      status: !answered ? "waiting" : r.source === "ai" ? "ai" : "human",
      // The draft ships whole: Send draft delivers it from the database, so a
      // trimmed copy would mean approving text you cannot see (and Edit and
      // send would silently drop the tail). The question above is only context,
      // so a snippet is fine there.
      draft: !answered && r.draft ? String(r.draft) : "",
      draft_sure: r.draft_sure === 1,
      created_at: r.created_at,
    };
  });

  const ai = await aiUsageToday(env).catch(() => null);
  return { ...base, waiting: waiting.n, humanAnswered: human.n, days, recent, ai };
}

export async function stats(env) {
  const users = await env.DB.prepare("SELECT COUNT(*) n FROM users").first();
  const active = await env.DB.prepare(
    "SELECT COUNT(*) n FROM users WHERE last_seen >= datetime('now','-7 day')").first();
  const installs = await env.DB.prepare("SELECT COALESCE(SUM(installs),0) n FROM users").first();
  const builders = await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE installs > 0").first();
  const banned = await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE banned = 1").first();
  // qa_log may not exist until migration 005 runs; treat that as zero.
  const qa = await env.DB.prepare("SELECT COUNT(*) n FROM qa_log").first().catch(() => ({ n: 0 }));
  const ai = await env.DB.prepare("SELECT COUNT(*) n FROM qa_log WHERE source = 'ai'").first().catch(() => ({ n: 0 }));
  return {
    users: users.n, active7d: active.n, installs: installs.n, builders: builders.n, banned: banned.n,
    questions: qa.n, aiAnswered: ai.n,
  };
}
