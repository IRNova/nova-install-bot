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
export async function setQaAnswerByCard(env, cardMsgId, answer) {
  await env.DB.prepare(
    `UPDATE qa_log SET answer = ?, source = 'human', answered_at = datetime('now')
     WHERE id = (SELECT qa_id FROM contact_map WHERE group_msg_id = ?)`
  ).bind(answer, cardMsgId).run();
}

export async function markQaResolved(env, qaId) {
  await env.DB.prepare("UPDATE qa_log SET resolved = 1 WHERE id = ?").bind(qaId).run();
}

export async function getQa(env, qaId) {
  return env.DB.prepare("SELECT * FROM qa_log WHERE id = ?").bind(qaId).first();
}

// Recent answered exchanges, most recent first. Human answers are the gold
// standard for the AI knowledge pack; pass source to filter.
export async function listAnsweredQa(env, { source = null, limit = 40 } = {}) {
  let q = "SELECT question, answer, lang, source FROM qa_log WHERE answer IS NOT NULL AND answer != ''";
  const binds = [];
  if (source) { q += " AND source = ?"; binds.push(source); }
  q += " ORDER BY id DESC LIMIT ?";
  binds.push(limit);
  const { results } = await env.DB.prepare(q).bind(...binds).all();
  return results || [];
}

// Everything the Overview pane needs in one payload: the base counters, support
// pipeline counts, a 14-day activity series, and the latest support questions.
// qa_log may not exist until migration 005 runs; every qa query degrades to zero.
export async function overview(env) {
  const base = await stats(env);
  const waiting = await env.DB.prepare(
    "SELECT COUNT(*) n FROM qa_log WHERE answer IS NULL OR answer = ''").first().catch(() => ({ n: 0 }));
  const human = await env.DB.prepare(
    "SELECT COUNT(*) n FROM qa_log WHERE source = 'human'").first().catch(() => ({ n: 0 }));

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
    "SELECT id, question, answer, lang, source, created_at FROM qa_log ORDER BY id DESC LIMIT 8"
  ).all().catch(() => ({ results: [] }));
  const recent = (recentRows || []).map((r) => ({
    id: r.id,
    question: String(r.question || "").slice(0, 200),
    lang: r.lang || "en",
    status: r.source === "ai" ? "ai" : (r.source === "human" || (r.answer && r.answer !== "")) ? "human" : "waiting",
    created_at: r.created_at,
  }));

  return { ...base, waiting: waiting.n, humanAnswered: human.n, days, recent };
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
