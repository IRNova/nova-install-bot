// Web admin panel: cookie-auth login, a dashboard, JSON CRUD APIs, broadcast.
// All routes live under /admin. Auth = an HMAC-signed cookie keyed on ADMIN_PASSWORD.

import { tg, send, esc } from "./telegram.js";
import { getConfig, setConfig, listFaq, listSections, stats, overview, markBlocked, listUsers, setBanned, getQa, getUserLang, setQaAnswer, isBanned } from "./db.js";
import { suggestFaqs } from "./ai.js";
import { contactKb } from "./bot.js";
import { t } from "./i18n.js";
import { DASHBOARD_HTML, LOGIN_HTML } from "./admin_ui.js";

const COOKIE = "nova_admin";

// ── crypto: sign / verify the session cookie ────────────────────────────────

async function hmac(env, data) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(env.ADMIN_PASSWORD || "unset"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeToken(env) {
  const ts = Date.now().toString();
  return `${ts}.${await hmac(env, ts)}`;
}

async function validToken(env, token) {
  if (!token) return false;
  const [ts, sig] = token.split(".");
  if (!ts || !sig) return false;
  // 30-day sessions.
  if (Date.now() - Number(ts) > 30 * 864e5) return false;
  return (await hmac(env, ts)) === sig;
}

function cookieValue(request) {
  const raw = request.headers.get("Cookie") || "";
  const m = raw.match(new RegExp(`${COOKIE}=([^;]+)`));
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

  if (path === "/admin/login" && method === "POST") {
    const form = await request.formData();
    const pw = form.get("password") || "";
    if (!env.ADMIN_PASSWORD || pw !== env.ADMIN_PASSWORD) {
      return new Response(LOGIN_HTML(true), { status: 401, headers: { "Content-Type": "text/html" } });
    }
    const token = await makeToken(env);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/admin",
        "Set-Cookie": `${COOKIE}=${encodeURIComponent(token)}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 864e5 / 1000}`,
      },
    });
  }

  if (path === "/admin/logout") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/admin", "Set-Cookie": `${COOKIE}=; Path=/admin; Max-Age=0` },
    });
  }

  // Everything below requires auth.
  const ok = await authed(request, env);

  if (path === "/admin" || path === "/admin/") {
    if (!ok) return new Response(LOGIN_HTML(false), { headers: { "Content-Type": "text/html" } });
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

  // Richer payload for the Overview pane: counters + 14-day series + recent Q&A.
  if (res === "overview" && method === "GET") {
    return json(await overview(env));
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
    for (const row of results || []) {
      await env.DB.prepare("UPDATE contact_map SET replied = 1 WHERE group_msg_id = ?")
        .bind(row.group_msg_id).run().catch(() => {});
      if (group && row.group_msg_id === row.card_msg_id) {
        await tg(env, "editMessageReplyMarkup", {
          chat_id: group, message_id: row.group_msg_id,
          reply_markup: contactKb(qa.user_id, banned, true),
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

  // ── config ──
  const CONFIG_KEYS = ["welcome", "welcome_en", "welcome_fa", "welcome_image",
    "contact_group_id", "contact_enabled", "faq_enabled",
    "join_required", "join_channel", "support_text", "support_links",
    "ai_enabled", "ai_mode", "ai_model", "ai_cf_model"];
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
    if (!env.ANTHROPIC_API_KEY && !env.AI) return json({ error: "no_ai" }, 400);
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
