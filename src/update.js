// "Update my panel": pushes the latest Nova worker.js onto a Worker the user
// picks on their own Cloudflare account. Uses the scripts /content endpoint,
// which swaps only the code, bindings, secrets, settings and data survive.
//
// The token has to live across a couple of button taps (list → pick → confirm),
// so it sits in the config table for at most 10 minutes and is deleted the
// moment the update runs, is cancelled, or expires.

import { send, edit } from "./telegram.js";
import { getConfig, setConfig, delConfig } from "./db.js";
import { cf, cfOk, cfErr, rand } from "./install.js";
import { t } from "./i18n.js";

const TTL_MS = 10 * 60 * 1000;
const MAX_WORKERS = 12;

const ctxKey = (userId) => `upd_ctx_${userId}`;

export async function loadUpdCtx(env, userId) {
  const raw = await getConfig(env, ctxKey(userId), "");
  if (!raw) return null;
  let ctx = null;
  try { ctx = JSON.parse(raw); } catch {}
  if (!ctx || !Array.isArray(ctx.w) || Date.now() - (ctx.ts || 0) > TTL_MS) {
    await delConfig(env, ctxKey(userId));
    return null;
  }
  return ctx;
}

export async function clearUpdCtx(env, userId) {
  await delConfig(env, ctxKey(userId));
}

// Token received while the user was in "update" mode: verify it, list the
// account's Workers and let the user pick which one is their Nova panel.
export async function startUpdate(env, chatId, token, userId, lang) {
  const v = await cf("GET", "/user/tokens/verify", token);
  if (!cfOk(v)) {
    const extra = token.length < 40 ? t(lang, "err_short") : "";
    return send(env, chatId, `❌ ${t(lang, "err_token")}${extra}\n\n<i>${cfErr(v)} · len ${token.length}</i>`);
  }

  const acc = await cf("GET", "/accounts?per_page=50", token);
  if (!cfOk(acc) || !acc.json.result || !acc.json.result.length) {
    return send(env, chatId, `❌ ${cfErr(acc)}`);
  }
  const accountId = acc.json.result[0].id;

  const list = await cf("GET", `/accounts/${accountId}/workers/scripts?per_page=100`, token);
  const names = ((cfOk(list) && list.json.result) || [])
    .map((s) => s.id).filter(Boolean);
  if (!names.length) return send(env, chatId, t(lang, "upd_none"));

  // Nova panels first, then alphabetical; keep the keyboard a sane size.
  names.sort((a, b) =>
    (b.startsWith("nova-") ? 1 : 0) - (a.startsWith("nova-") ? 1 : 0) || a.localeCompare(b));
  const shown = names.slice(0, MAX_WORKERS);

  let sub = "";
  const sg = await cf("GET", `/accounts/${accountId}/workers/subdomain`, token);
  if (cfOk(sg) && sg.json.result && sg.json.result.subdomain) sub = sg.json.result.subdomain;

  await setConfig(env, ctxKey(userId), JSON.stringify({
    t: token, a: accountId, s: sub, w: shown, ts: Date.now(),
  }));

  const rows = shown.map((n, i) => [{ text: n, callback_data: `updp:${i}` }]);
  rows.push([{ text: t(lang, "btn_upd_cancel"), callback_data: "updx" }]);
  return send(env, chatId, t(lang, "upd_pick"), { reply_markup: { inline_keyboard: rows } });
}

// The user confirmed: fetch the latest worker.js and replace the script's
// content. Single-use, the stored token is deleted before the upload starts.
export async function runUpdate(env, chatId, msgId, userId, idx, lang) {
  const ctx = await loadUpdCtx(env, userId);
  const name = ctx && ctx.w[idx];
  if (!name) return edit(env, chatId, msgId, t(lang, "upd_expired"));
  await clearUpdCtx(env, userId);

  await edit(env, chatId, msgId, t(lang, "upd_run"));
  try {
    const wjResp = await fetch(env.WORKER_JS_URL);
    if (!wjResp.ok) throw new Error(`worker.js download failed (HTTP ${wjResp.status})`);
    const code = await wjResp.text();
    if (!code || code.length < 1000 || code.indexOf("export default") < 0) {
      throw new Error("downloaded worker.js looks invalid");
    }

    const boundary = "----nova" + rand(12);
    const metadata = JSON.stringify({ main_module: "worker.js" });
    const pre =
      `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n` +
      `Content-Type: application/json\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n` +
      `Content-Type: application/javascript+module\r\n\r\n`;
    const post = `\r\n--${boundary}--\r\n`;
    const res = await cf("PUT",
      `/accounts/${ctx.a}/workers/scripts/${encodeURIComponent(name)}/content`,
      ctx.t, new Blob([pre, code, post]), `multipart/form-data; boundary=${boundary}`);
    if (!cfOk(res)) throw new Error(cfErr(res));

    const extra = ctx.s ? {
      reply_markup: { inline_keyboard: [[
        { text: t(lang, "btn_open_panel"), url: `https://${name}.${ctx.s}.workers.dev`, style: "primary" },
      ]] },
    } : {};
    return edit(env, chatId, msgId, t(lang, "upd_done", name), extra);
  } catch (e) {
    return edit(env, chatId, msgId, `${t(lang, "upd_fail")}: <i>${(e && e.message) || "unknown error"}</i>`);
  }
}
