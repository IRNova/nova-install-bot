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

export async function stats(env) {
  const users = await env.DB.prepare("SELECT COUNT(*) n FROM users").first();
  const active = await env.DB.prepare(
    "SELECT COUNT(*) n FROM users WHERE last_seen >= datetime('now','-7 day')").first();
  const installs = await env.DB.prepare("SELECT COALESCE(SUM(installs),0) n FROM users").first();
  const builders = await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE installs > 0").first();
  const banned = await env.DB.prepare("SELECT COUNT(*) n FROM users WHERE banned = 1").first();
  return {
    users: users.n, active7d: active.n, installs: installs.n, builders: builders.n, banned: banned.n,
  };
}
