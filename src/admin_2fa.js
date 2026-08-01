// Telegram-based second factor for the web admin panel.
//
// Flow: correct password issues a short-lived challenge instead of a session.
// A 6-digit code goes to every Telegram id on the panel allowlist, and only
// that code turns the challenge into a session cookie.
//
// Everything fails closed. No allowlist configured means no panel access, the
// same rule ADMIN_PASSWORD already follows, so a half-configured deployment is
// locked rather than silently downgraded to password-only.

import { send } from "./telegram.js";
import { getConfig, setConfig, delConfig } from "./db.js";

export const ADMIN_IDS_KEY = "panel_admin_ids";
export const SESSION_KEY = "session_key";

const CHALLENGE_PREFIX = "twofa_";
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // a code is valid for 5 minutes
const MAX_CODE_TRIES = 5; // wrong codes before the challenge is burned
const LOCK_AFTER_FAILS = 8; // wrong passwords from one IP before a lockout
const LOCK_WINDOW_MS = 15 * 60 * 1000;

// Constant-time compare so neither the password nor a 2FA code leaks through
// response timing.
export function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Codes are stored hashed, never in clear text, so a D1 read cannot replay a
// live challenge. The "2fa:" label keeps this key space separate from the
// session-cookie HMAC even though both derive from ADMIN_PASSWORD.
async function hashCode(env, challengeId, code) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode("2fa:" + (env.ADMIN_PASSWORD || "unset")),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${challengeId}.${code}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Rejection sampling keeps every 6-digit code equally likely. A plain modulo
// would bias the low end of the range.
function randomCode() {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 1000000) * 1000000;
  let v;
  do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
  return String(v % 1000000).padStart(6, "0");
}

// ── session signing key ─────────────────────────────────────────────────────

// Session cookies are signed with this random key, NOT with ADMIN_PASSWORD.
// Deriving the key from the password meant anyone who learned the password
// could mint a valid cookie offline and skip the second factor entirely, which
// is precisely the attack 2FA exists to stop. The repo is public, so the
// algorithm is known; only this secret is not.
export async function getSessionKey(env) {
  let k = await getConfig(env, SESSION_KEY, "");
  if (!/^[0-9a-f]{64}$/.test(k)) {
    k = randomHex(32);
    await setConfig(env, SESSION_KEY, k);
  }
  return k;
}

// Rotating the key invalidates every outstanding session at once. Use it if a
// device is lost or an admin is removed.
export async function rotateSessionKey(env) {
  const k = randomHex(32);
  await setConfig(env, SESSION_KEY, k);
  return k;
}

// ── panel admin allowlist ───────────────────────────────────────────────────

export async function getPanelAdminIds(env) {
  const raw = await getConfig(env, ADMIN_IDS_KEY, "");
  return String(raw)
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^-?\d+$/.test(s));
}

export async function setPanelAdminIds(env, ids) {
  const clean = (Array.isArray(ids) ? ids : String(ids).split(/[,\s]+/))
    .map((s) => String(s).trim())
    .filter((s) => /^-?\d+$/.test(s));
  await setConfig(env, ADMIN_IDS_KEY, [...new Set(clean)].join(","));
  return clean;
}

// ── login rate limiting ─────────────────────────────────────────────────────

function ipKey(ip) { return `loginfail_${ip || "unknown"}`; }

export async function isLockedOut(env, ip) {
  const raw = await getConfig(env, ipKey(ip), "");
  if (!raw) return false;
  let st; try { st = JSON.parse(raw); } catch { return false; }
  if (!st || Date.now() > st.until) return false;
  return st.n >= LOCK_AFTER_FAILS;
}

export async function noteLoginFailure(env, ip) {
  const raw = await getConfig(env, ipKey(ip), "");
  let st = { n: 0, until: 0 };
  try { if (raw) st = JSON.parse(raw); } catch { /* reset on corrupt value */ }
  if (Date.now() > st.until) st = { n: 0, until: Date.now() + LOCK_WINDOW_MS };
  st.n += 1;
  await setConfig(env, ipKey(ip), JSON.stringify(st));
  return st.n;
}

export async function clearLoginFailures(env, ip) {
  await delConfig(env, ipKey(ip)).catch(() => {});
}

// ── challenges ──────────────────────────────────────────────────────────────

// Best-effort sweep of expired challenges so the config table cannot grow
// without bound from abandoned logins.
async function sweepExpired(env) {
  await env.DB.prepare(
    "DELETE FROM config WHERE key LIKE ?1 AND CAST(json_extract(value, '$.exp') AS INTEGER) < ?2"
  ).bind(CHALLENGE_PREFIX + "%", Date.now()).run().catch(() => {});
}

// Returns null when the panel has no allowlist, which the caller must treat as
// a hard failure rather than a reason to skip the second factor.
export async function startChallenge(env, meta = {}) {
  const ids = await getPanelAdminIds(env);
  if (!ids.length) return null;

  await sweepExpired(env);

  const challengeId = randomHex(16);
  // Each admin gets a DIFFERENT code, so the code that comes back identifies
  // who approved the sign-in. One shared code could not be attributed.
  const codes = ids.map((id) => ({ id, code: randomCode() }));
  await setConfig(env, CHALLENGE_PREFIX + challengeId, JSON.stringify({
    codes: await Promise.all(codes.map(async (c) => ({
      id: c.id, h: await hashCode(env, challengeId, c.code),
    }))),
    exp: Date.now() + CHALLENGE_TTL_MS,
    tries: 0,
  }));

  // The notification doubles as a breach alarm: an admin who did not just try
  // to sign in now knows the password is known to someone else.
  const where = [meta.ip && `IP: ${meta.ip}`, meta.ua && `Device: ${meta.ua}`]
    .filter(Boolean).join("\n");

  let delivered = 0;
  for (const c of codes) {
    const text =
      `<b>Admin panel sign-in</b>\n\n` +
      `Your code is <code>${c.code}</code>\n` +
      `It expires in 5 minutes.\n\n` +
      (where ? where + "\n\n" : "") +
      `If this was not you, change ADMIN_PASSWORD now.`;
    const r = await send(env, c.id, text).catch(() => null);
    if (r && r.ok) delivered += 1;
  }
  // Nobody received the code, so the challenge is unusable. Burn it rather
  // than leaving a live challenge nobody can answer.
  if (!delivered) {
    await delConfig(env, CHALLENGE_PREFIX + challengeId).catch(() => {});
    return { challengeId: null, delivered: 0, recipients: ids.length };
  }
  return { challengeId, delivered, recipients: ids.length };
}

export async function verifyChallenge(env, challengeId, code) {
  if (!challengeId || !/^[0-9a-f]{32}$/.test(challengeId)) return { ok: false, reason: "invalid" };
  if (!/^\d{6}$/.test(String(code || ""))) return { ok: false, reason: "invalid" };

  const key = CHALLENGE_PREFIX + challengeId;
  const raw = await getConfig(env, key, "");
  if (!raw) return { ok: false, reason: "expired" };

  let st; try { st = JSON.parse(raw); } catch { await delConfig(env, key); return { ok: false, reason: "expired" }; }
  if (!st || Date.now() > st.exp) { await delConfig(env, key); return { ok: false, reason: "expired" }; }
  if (st.tries >= MAX_CODE_TRIES) { await delConfig(env, key); return { ok: false, reason: "burned" }; }

  // Compare against every recipient's code so we learn which admin approved.
  const got = await hashCode(env, challengeId, String(code));
  const hit = (st.codes || []).find((c) => timingSafeEqual(got, c.h));
  if (hit) {
    await delConfig(env, key); // single use
    return { ok: true, adminId: String(hit.id) };
  }

  st.tries += 1;
  if (st.tries >= MAX_CODE_TRIES) { await delConfig(env, key); return { ok: false, reason: "burned" }; }
  await setConfig(env, key, JSON.stringify(st));
  return { ok: false, reason: "wrong", left: MAX_CODE_TRIES - st.tries };
}
