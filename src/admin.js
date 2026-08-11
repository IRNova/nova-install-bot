// Web admin panel: cookie-auth login, a dashboard, JSON CRUD APIs, broadcast.
// All routes live under /admin. Auth = password, then a Telegram second factor,
// then a cookie HMAC-signed with a random server-side session key (NOT the
// password) and naming the admin who approved it.

import { tg, send, esc } from "./telegram.js";
import { getConfig, setConfig, listFaq, listSections, stats, overview, listWaitingQa, markBlocked, listUsers, setBanned, getQa, getUserLang, setQaAnswer, isBanned, listOffenders, resetOffender, setOffenderStatus, listSuggestions, setQaSource } from "./db.js";
import { suggestFaqs, aiEnabled } from "./ai.js";
import { contactKb, PRODUCTS } from "./bot.js";
import { t } from "./i18n.js";
import { DASHBOARD_HTML, LOGIN_HTML, VERIFY_HTML } from "./admin_ui.js";
import {
  startChallenge, verifyChallenge, getPanelAdminIds, setPanelAdminIds,
  isLockedOut, noteLoginFailure, clearLoginFailures, timingSafeEqual as ctEqual,
  getSessionKey, rotateSessionKey,
} from "./admin_2fa.js";

const COOKIE = "nova_admin";
const PENDING = "nova_2fa";
// Sessions used to last 30 days. With a second factor in front of them, a
// shorter window costs one extra sign-in a week and sharply limits how long a
// stolen cookie stays useful.
const SESSION_DAYS = 7;

// ── crypto: sign / verify the session cookie ────────────────────────────────

// Constant-time string compare so checking the admin password doesn't leak its
// length/prefix through response timing.
function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Signed with the random session key, never with ADMIN_PASSWORD. If the
// password were the key, anyone who learned it could mint a cookie offline and
// walk straight past the Telegram second factor.
async function hmac(env, data) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(await getSessionKey(env)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The approving admin's Telegram id is part of the signed payload, so a session
// records who opened it and can be revoked by dropping that id.
export async function makeToken(env, adminId) {
  const ts = Date.now().toString();
  return `${ts}.${adminId}.${await hmac(env, `${ts}.${adminId}`)}`;
}

export async function validToken(env, token) {
  // No password configured means no admin access at all, unchanged.
  if (!env.ADMIN_PASSWORD) return false;
  if (!token) return false;
  const [ts, adminId, sig] = token.split(".");
  if (!ts || !adminId || !sig) return false;
  if (Date.now() - Number(ts) > SESSION_DAYS * 864e5) return false;
  if (!ctEqual(await hmac(env, `${ts}.${adminId}`), sig)) return false;
  // Removing someone from the allowlist kills their live sessions immediately
  // rather than leaving them valid for up to a week.
  return (await getPanelAdminIds(env)).includes(String(adminId));
}

function cookieValue(request, name = COOKIE) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : "";
}

async function authed(request, env) {
  return validToken(env, cookieValue(request));
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// ── Router ──────────────────────────────────────────────────────────────────

export async function handleAdmin(request, env, ctx, url) {
  const path = url.pathname;
  const method = request.method;

  const html = (body, status = 200) =>
    new Response(body, { status, headers: { "Content-Type": "text/html" } });

  if (path === "/admin/login" && method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") || "";
    // Throttle first, so a locked-out client cannot keep testing passwords.
    if (await isLockedOut(env, ip)) return html(LOGIN_HTML("locked"), 429);

    const form = await request.formData();
    const pw = form.get("password") || "";
    if (!env.ADMIN_PASSWORD || !timingSafeEqual(pw, env.ADMIN_PASSWORD)) {
      await noteLoginFailure(env, ip);
      return html(LOGIN_HTML("bad"), 401);
    }

    // Password alone is no longer enough. Without a configured allowlist there
    // is nobody to send a code to, so refuse rather than fall back to
    // password-only access.
    const ch = await startChallenge(env, { ip, ua: request.headers.get("User-Agent") || "" });
    if (!ch) return html(LOGIN_HTML("no2fa"), 403);
    if (!ch.challengeId) return html(LOGIN_HTML("undeliverable"), 502);

    // Issuing a code counts against the same lockout budget. Otherwise someone
    // who already had the password could sit and spam an admin's Telegram with
    // codes forever without ever tripping the throttle. Completing the second
    // factor is what clears the counter.
    await noteLoginFailure(env, ip);
    return new Response(VERIFY_HTML(null, ch.delivered), {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Set-Cookie": `${PENDING}=${encodeURIComponent(ch.challengeId)}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=300`,
      },
    });
  }

  if (path === "/admin/verify" && method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (await isLockedOut(env, ip)) return html(LOGIN_HTML("locked"), 429);

    const form = await request.formData();
    const res = await verifyChallenge(env, cookieValue(request, PENDING), form.get("code") || "");
    if (!res.ok) {
      // A dead challenge sends the user back to the password step; a merely
      // wrong digit keeps them on the code step with their remaining tries.
      if (res.reason === "wrong") return html(VERIFY_HTML("wrong", 0, res.left), 401);
      await noteLoginFailure(env, ip);
      return new Response(LOGIN_HTML(res.reason === "burned" ? "burned" : "expired"), {
        status: 401,
        headers: { "Content-Type": "text/html", "Set-Cookie": `${PENDING}=; Path=/admin; Max-Age=0` },
      });
    }

    await clearLoginFailures(env, ip);
    const token = await makeToken(env, res.adminId);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin",
        "Set-Cookie": `${COOKIE}=${encodeURIComponent(token)}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`,
      },
    });
  }

  if (path === "/admin/logout") {
    return new Response(null, {
      status: 302,
      headers: [
        ["Location", "/admin"],
        ["Set-Cookie", `${COOKIE}=; Path=/admin; Max-Age=0`],
        ["Set-Cookie", `${PENDING}=; Path=/admin; Max-Age=0`],
      ],
    });
  }

  // Everything below requires auth.
  const ok = await authed(request, env);

  if (path === "/admin" || path === "/admin/") {
    if (!ok) return new Response(LOGIN_HTML(null), { headers: { "Content-Type": "text/html" } });
    return new Response(DASHBOARD_HTML, { headers: { "Content-Type": "text/html" } });
  }

  if (path.startsWith("/admin/api/")) {
    if (!ok) return json({ error: "unauthorized" }, 401);
    return handleApi(request, env, ctx, path.slice("/admin/api/".length), method);
  }

  return new Response("not found", { status: 404 });
}

// ── JSON API ────────────────────────────────────────────────────────────────

async function handleApi(request, env, ctx, res, method) {
  const body = method === "GET" ? {} : await request.json().catch(() => ({}));

  if (res === "stats" && method === "GET") {
    return json(await stats(env));
  }

  // Who may complete a panel sign-in. These ids receive the Telegram code, so
  // emptying the list locks the panel for everyone, including the caller.
  if (res === "panel-admins" && method === "GET") {
    return json({ ids: await getPanelAdminIds(env) });
  }

  if (res === "panel-admins" && method === "POST") {
    const ids = await setPanelAdminIds(env, body.ids ?? "");
    if (!ids.length) return json({ ids, warning: "empty_locks_panel" });
    return json({ ids });
  }

  // "Log out everywhere": rotating the signing key invalidates every session,
  // including the caller's. Use after losing a device.
  if (res === "revoke-sessions" && method === "POST") {
    await rotateSessionKey(env);
    return json({ ok: true, note: "all_sessions_invalidated" });
  }

  // Richer payload for the Overview pane: counters + 14-day series + recent Q&A.
  if (res === "overview" && method === "GET") {
    return json(await overview(env));
  }

  // The full backlog of unanswered questions for the Waiting inbox.
  if (res === "qa-waiting" && method === "GET") {
    return json(await listWaitingQa(env, { limit: 200 }));
  }

  /* Suggestions: messages an admin tagged 💡 in the Telegram group rather than
   * answering. They are feature requests from users, and they were disappearing
   * into the qa_log with nowhere to read them back. Marking one done keeps it in
   * the list (source 'suggestion_done') instead of deleting it, since the point
   * of the pile is to still be there when you plan the next release. */
  if (res === "suggestions" && method === "GET") {
    return json(await listSuggestions(env, 200));
  }
  if (res === "suggestion-done" && method === "POST") {
    const id = Number(body.id);
    if (!id) return json({ error: "empty" }, 400);
    await setQaSource(env, id, body.undo ? "suggestion" : "suggestion_done");
    return json({ ok: true });
  }

  // Answer a support question straight from the panel: deliver via the bot in
  // the user's language, record it (the AI learns from it), and flip any
  // Telegram group cards for this question to "Replied".
  // qa-reply sends admin-typed text (source 'human'); qa-approve sends the
  // stored AI draft as-is (source 'approved').
  if ((res === "qa-reply" || res === "qa-approve") && method === "POST") {
    const id = Number(body.id);
    if (!id) return json({ error: "empty" }, 400);
    const qa = await getQa(env, id).catch(() => null);
    if (!qa || !qa.user_id) return json({ error: "not_found" }, 404);
    const approving = res === "qa-approve";
    const text = approving ? String(qa.draft || "") : String(body.text || "").trim();
    if (!text) return json({ error: approving ? "no_draft" : "empty" }, 400);
    if (approving && qa.answer) return json({ error: "already_answered" }, 409);
    const lang = (await getUserLang(env, qa.user_id)) || qa.lang || "en";
    // Drafts may carry allowed Telegram HTML; admin-typed text is escaped.
    let r = await send(env, qa.user_id, `${t(lang, "reply_prefix")}\n\n${approving ? text : esc(text)}`);
    if (approving && (!r || r.ok === false)) {
      r = await send(env, qa.user_id, `${t(lang, "reply_prefix")}\n\n${esc(text)}`);
    }
    if (!r || r.ok === false) {
      if (r && r.error_code === 403) await markBlocked(env, qa.user_id).catch(() => {});
      return json({ error: "undeliverable" }, 502);
    }
    await setQaAnswer(env, id, text, approving ? "approved" : "human");
    const group = await getConfig(env, "contact_group_id", "");
    const banned = await isBanned(env, qa.user_id).catch(() => false);
    const { results } = await env.DB.prepare(
      "SELECT group_msg_id, card_msg_id FROM contact_map WHERE qa_id = ?"
    ).bind(id).all().catch(() => ({ results: [] }));
    // Keep the Close / Suggestion / tag rows: answering from the panel must not
    // strip buttons off a card the group is still working with.
    const stored = await getConfig(env, `qprod_${id}`, "");
    for (const row of results || []) {
      await env.DB.prepare("UPDATE contact_map SET replied = 1 WHERE group_msg_id = ?")
        .bind(row.group_msg_id).run().catch(() => {});
      if (group && row.group_msg_id === row.card_msg_id) {
        await tg(env, "editMessageReplyMarkup", {
          chat_id: group, message_id: row.group_msg_id,
          reply_markup: contactKb(qa.user_id, banned, true, null, id, PRODUCTS[stored] ? stored : null),
        }).catch(() => {});
      }
    }
    return json({ ok: true });
  }

  // ── users / ban ──
  if (res === "users" && method === "GET") {
    const url = new URL(request.url);
    return json(await listUsers(env, { search: (url.searchParams.get("q") || "").trim() }));
  }
  if (res === "users" && method === "POST") {
    const id = Number(body.id);
    if (!id) return json({ error: "bad id" }, 400);
    await setBanned(env, id, !!body.banned);
    return json({ ok: true });
  }

  // ── profanity offenders ──
  // Everyone the community-group profanity filter has flagged, plus actions to
  // reset a strike count, lift a mute, or reverse a ban (also restoring them in
  // the Telegram group when we can).
  if (res === "offenders" && method === "GET") {
    return json(await listOffenders(env, { limit: 200 }));
  }
  if (res === "offender-action" && method === "POST") {
    const id = Number(body.user_id);
    const action = String(body.action || "");
    if (!id) return json({ error: "bad id" }, 400);
    const group = await getConfig(env, "community_group_id", "");
    if (action === "unmute") {
      if (group) await tg(env, "restrictChatMember", { chat_id: group, user_id: id, permissions: {
        can_send_messages: true, can_send_media_messages: true, can_send_polls: true,
        can_send_other_messages: true, can_add_web_page_previews: true, can_invite_users: true,
      } }).catch(() => {});
      await setOffenderStatus(env, id, "active", 0);
    } else if (action === "unban") {
      if (group) await tg(env, "unbanChatMember", { chat_id: group, user_id: id, only_if_banned: true }).catch(() => {});
      await setBanned(env, id, false);
      await resetOffender(env, id);
    } else if (action === "reset") {
      await resetOffender(env, id);
    } else {
      return json({ error: "bad action" }, 400);
    }
    return json({ ok: true });
  }

  // ── config ──
  const CONFIG_KEYS = ["welcome", "welcome_en", "welcome_fa", "welcome_image",
    "contact_group_id", "contact_enabled", "faq_enabled",
    "join_required", "join_channel", "support_text", "support_links",
    "ai_enabled", "ai_mode", "ai_model", "ai_cf_model",
    "community_group_id", "community_gate", "community_cleanup",
    "profanity_on", "profanity_words", "profanity_mute", "profanity_ban", "profanity_mute_min"];
  if (res === "config" && method === "GET") {
    const out = {};
    for (const k of CONFIG_KEYS) out[k] = await getConfig(env, k, "");
    return json(out);
  }
  if (res === "config" && method === "POST") {
    for (const [k, v] of Object.entries(body)) {
      if (CONFIG_KEYS.includes(k)) await setConfig(env, k, v);
    }
    return json({ ok: true });
  }

  // ── faq ──
  // Draft FAQ entries from real support questions (inserted disabled for review).
  if (res === "faq-suggest" && method === "POST") {
    // Respects the AI toggle, not just the presence of a provider: turning the
    // AI off has to stop every call, and this is the most expensive one.
    if (!(await aiEnabled(env))) return json({ error: "no_ai" }, 400);
    try {
      const drafts = await suggestFaqs(env);
      return json({ ok: true, added: drafts.length });
    } catch (e) {
      return json({ error: String(e && e.message || e) }, 500);
    }
  }
  if (res === "faq" && method === "GET") return json(await listFaq(env, false));
  if (res === "faq" && method === "POST") {
    await env.DB.prepare(
      "INSERT INTO faq (question, answer, position, enabled) VALUES (?, ?, ?, ?)"
    ).bind(body.question || "", body.answer || "", +body.position || 0, body.enabled ? 1 : 1).run();
    return json({ ok: true });
  }
  if (res === "faq" && method === "PUT") {
    await env.DB.prepare(
      "UPDATE faq SET question=?, answer=?, position=?, enabled=? WHERE id=?"
    ).bind(body.question || "", body.answer || "", +body.position || 0, body.enabled ? 1 : 0, body.id).run();
    return json({ ok: true });
  }
  if (res === "faq" && method === "DELETE") {
    await env.DB.prepare("DELETE FROM faq WHERE id=?").bind(body.id).run();
    return json({ ok: true });
  }

  // ── sections ──
  if (res === "sections" && method === "GET") return json(await listSections(env, false));
  if (res === "sections" && method === "POST") {
    await env.DB.prepare(
      "INSERT INTO sections (title, body, button_text, button_url, position, enabled) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(body.title || "", body.body || "", body.button_text || "", body.button_url || "",
      +body.position || 0, 1).run();
    return json({ ok: true });
  }
  if (res === "sections" && method === "PUT") {
    await env.DB.prepare(
      "UPDATE sections SET title=?, body=?, button_text=?, button_url=?, position=?, enabled=? WHERE id=?"
    ).bind(body.title || "", body.body || "", body.button_text || "", body.button_url || "",
      +body.position || 0, body.enabled ? 1 : 0, body.id).run();
    return json({ ok: true });
  }
  if (res === "sections" && method === "DELETE") {
    await env.DB.prepare("DELETE FROM sections WHERE id=?").bind(body.id).run();
    return json({ ok: true });
  }

  // ── broadcast ──
  if (res === "broadcast" && method === "POST") {
    const text = (body.text || "").trim();
    if (!text) return json({ error: "empty" }, 400);
    const { results } = await env.DB.prepare("SELECT id FROM users WHERE blocked = 0 AND banned = 0").all();
    const ids = (results || []).map((r) => r.id);
    ctx.waitUntil(runBroadcast(env, ids, text));
    return json({ ok: true, recipients: ids.length });
  }

  return json({ error: "unknown endpoint" }, 404);
}

async function runBroadcast(env, ids, text) {
  for (const id of ids) {
    const res = await send(env, id, text).catch(() => null);
    if (res && res.ok === false && res.error_code === 403) {
      await markBlocked(env, id).catch(() => {});
    }
    // Stay well under Telegram's ~30 msg/s ceiling.
    await new Promise((r) => setTimeout(r, 45));
  }
}
