// Secure "Update my panel" flow.
//
// A Cloudflare token is needed across the pick/confirm button taps. It is
// encrypted with AES-GCM before D1 storage, expires after ten minutes, and is
// deleted before an update starts. Updates explicitly inherit every existing
// binding and verify the binding set again after the upload.

import { send, edit, esc } from "./telegram.js";
import {
  cf, cfOk, cfErr, downloadWorkerCode, workerUpload,
} from "./install.js";
import { t } from "./i18n.js";

const TTL_MS = 10 * 60 * 1000;
const MAX_WORKERS = 12;
const MAX_SETTINGS_CHECKS = 30;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(value) {
  const s = atob(value);
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function sessionKey(env, userId) {
  if (!env.BOT_TOKEN) throw new Error("BOT_TOKEN is required for update-session encryption");
  const root = await crypto.subtle.importKey(
    "raw", encoder.encode(env.BOT_TOKEN), "HKDF", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey({
    name: "HKDF",
    hash: "SHA-256",
    salt: encoder.encode("nova-install-bot/update-session/v1"),
    info: encoder.encode(`telegram-user:${userId}`),
  }, root, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptToken(env, userId, token, expiresAt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = encoder.encode(`nova-update:${userId}:${expiresAt}`);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    await sessionKey(env, userId),
    encoder.encode(token),
  );
  return { cipher: b64(new Uint8Array(cipher)), iv: b64(iv) };
}

async function decryptToken(env, userId, cipher, iv, expiresAt) {
  const aad = encoder.encode(`nova-update:${userId}:${expiresAt}`);
  const clear = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(iv), additionalData: aad },
    await sessionKey(env, userId),
    unb64(cipher),
  );
  return decoder.decode(clear);
}

async function saveUpdCtx(env, chatId, userId, token, workers) {
  const expiresAt = Date.now() + TTL_MS;
  const encrypted = await encryptToken(env, userId, token, expiresAt);
  await env.DB.prepare(
    `INSERT INTO update_sessions
       (user_id, chat_id, token_cipher, token_iv, workers_json, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       chat_id = excluded.chat_id,
       token_cipher = excluded.token_cipher,
       token_iv = excluded.token_iv,
       workers_json = excluded.workers_json,
       expires_at = excluded.expires_at,
       created_at = datetime('now')`,
  ).bind(
    userId, chatId, encrypted.cipher, encrypted.iv,
    JSON.stringify(workers), expiresAt,
  ).run();
}

export async function loadUpdCtx(env, userId) {
  const row = await env.DB.prepare(
    `SELECT chat_id, token_cipher, token_iv, workers_json, expires_at
       FROM update_sessions WHERE user_id = ?`,
  ).bind(userId).first();
  if (!row) return null;
  if (Number(row.expires_at) <= Date.now()) {
    await clearUpdCtx(env, userId);
    return null;
  }
  try {
    const workers = JSON.parse(row.workers_json);
    if (!Array.isArray(workers)) throw new Error("invalid worker list");
    const token = await decryptToken(
      env, userId, row.token_cipher, row.token_iv, Number(row.expires_at),
    );
    return { t: token, w: workers, expiresAt: Number(row.expires_at) };
  } catch {
    await clearUpdCtx(env, userId);
    return null;
  }
}

export async function clearUpdCtx(env, userId) {
  await env.DB.prepare("DELETE FROM update_sessions WHERE user_id = ?").bind(userId).run();
}

export async function pruneExpiredUpdateSessions(env) {
  return env.DB.prepare("DELETE FROM update_sessions WHERE expires_at <= ?")
    .bind(Date.now()).run();
}

function resultBindings(response) {
  const result = response && response.json && response.json.result;
  return Array.isArray(result && result.bindings) ? result.bindings : [];
}

function isNovaWorker(settingsResponse) {
  return cfOk(settingsResponse) && resultBindings(settingsResponse)
    .some((binding) => binding && binding.type === "d1" && binding.name === "DB");
}

function bindingFingerprint(bindings) {
  const resourceKeys = [
    "id", "namespace_id", "database_id", "service", "environment",
    "bucket_name", "queue_name", "class_name", "script_name",
  ];
  return bindings.map((binding) => {
    const safe = { name: binding.name || "", type: binding.type || "" };
    for (const key of resourceKeys) {
      if (binding[key] !== undefined) safe[key] = binding[key];
    }
    return safe;
  }).sort((a, b) => `${a.name}:${a.type}`.localeCompare(`${b.name}:${b.type}`));
}

function sameBindings(before, after) {
  return JSON.stringify(bindingFingerprint(before)) === JSON.stringify(bindingFingerprint(after));
}

function workerLabel(worker, showAccount) {
  return showAccount && worker.c ? `${worker.n} · ${worker.c}` : worker.n;
}

// Verify a one-time token, enumerate accessible accounts, and only offer
// Workers that have Nova's required D1 binding named DB.
export async function startUpdate(env, chatId, token, userId, lang) {
  try {
    const verified = await cf("GET", "/user/tokens/verify", token);
    if (!cfOk(verified)) {
      const extra = token.length < 40 ? t(lang, "err_short") : "";
      return send(env, chatId,
        `❌ ${t(lang, "err_token")}${extra}\n\n<i>${esc(cfErr(verified))} · len ${token.length}</i>`);
    }

    const accountsResponse = await cf("GET", "/accounts?per_page=50", token);
    const accounts = (cfOk(accountsResponse) && accountsResponse.json.result) || [];
    if (!accounts.length) return send(env, chatId, `❌ ${esc(cfErr(accountsResponse))}`);

    const candidates = [];
    let settingsChecked = 0;
    for (const account of accounts) {
      const list = await cf(
        "GET", `/accounts/${account.id}/workers/scripts?per_page=100`, token,
      );
      const names = ((cfOk(list) && list.json.result) || [])
        .map((script) => script.id).filter(Boolean)
        .sort((a, b) =>
          (b.startsWith("nova-") ? 1 : 0) - (a.startsWith("nova-") ? 1 : 0) ||
          a.localeCompare(b));
      if (!names.length) continue;

      let subdomain = "";
      const sub = await cf("GET", `/accounts/${account.id}/workers/subdomain`, token);
      if (cfOk(sub) && sub.json.result) subdomain = sub.json.result.subdomain || "";

      for (const name of names) {
        if (candidates.length >= MAX_WORKERS ||
            settingsChecked >= MAX_SETTINGS_CHECKS) break;
        settingsChecked++;
        const settings = await cf(
          "GET",
          `/accounts/${account.id}/workers/scripts/${encodeURIComponent(name)}/settings`,
          token,
        );
        if (isNovaWorker(settings)) {
          candidates.push({
            n: name,
            a: account.id,
            c: account.name || "",
            s: subdomain,
          });
        }
        if (candidates.length >= MAX_WORKERS) break;
      }
      if (candidates.length >= MAX_WORKERS ||
          settingsChecked >= MAX_SETTINGS_CHECKS) break;
    }

    if (!candidates.length) return send(env, chatId, t(lang, "upd_none_verified"));
    await saveUpdCtx(env, chatId, userId, token, candidates);
    token = "";

    const showAccount = accounts.length > 1;
    const rows = candidates.map((worker, i) => [{
      text: workerLabel(worker, showAccount),
      callback_data: `updp:${i}`,
    }]);
    rows.push([{ text: t(lang, "btn_upd_cancel"), callback_data: "updx" }]);
    return send(env, chatId, t(lang, "upd_pick"), {
      reply_markup: { inline_keyboard: rows },
    });
  } catch (error) {
    return send(
      env, chatId,
      `${t(lang, "upd_fail")}: <i>${esc((error && error.message) || "unknown error")}</i>`,
    );
  } finally {
    token = "";
  }
}

// Fetch the verified artifact, inherit the exact current binding names, upload
// once, and fail visibly if Cloudflare reports that any binding changed.
export async function runUpdate(env, chatId, msgId, userId, idx, lang) {
  const ctx = await loadUpdCtx(env, userId);
  const worker = ctx && ctx.w[idx];
  if (!worker) return edit(env, chatId, msgId, t(lang, "upd_expired"));
  await clearUpdCtx(env, userId);

  await edit(env, chatId, msgId, t(lang, "upd_run"));
  let token = ctx.t;
  try {
    const beforeResponse = await cf(
      "GET",
      `/accounts/${worker.a}/workers/scripts/${encodeURIComponent(worker.n)}/settings`,
      token,
    );
    if (!isNovaWorker(beforeResponse)) throw new Error(t(lang, "upd_not_nova"));
    const beforeBindings = resultBindings(beforeResponse);

    const code = await downloadWorkerCode(env);
    const upload = workerUpload(code, {
      main_module: "worker.js",
      bindings: beforeBindings.map((binding) => ({
        type: "inherit",
        name: binding.name,
      })),
    }, "novaupdate");
    const response = await cf(
      "PUT",
      `/accounts/${worker.a}/workers/scripts/${encodeURIComponent(worker.n)}/content`,
      token,
      upload.body,
      upload.contentType,
    );
    if (!cfOk(response)) throw new Error(cfErr(response));

    const afterResponse = await cf(
      "GET",
      `/accounts/${worker.a}/workers/scripts/${encodeURIComponent(worker.n)}/settings`,
      token,
    );
    if (!cfOk(afterResponse) ||
        !sameBindings(beforeBindings, resultBindings(afterResponse))) {
      throw new Error(t(lang, "upd_bindings_changed"));
    }

    const extra = worker.s ? {
      reply_markup: { inline_keyboard: [[{
        text: t(lang, "btn_open_panel"),
        url: `https://${worker.n}.${worker.s}.workers.dev`,
        style: "primary",
      }]] },
    } : {};
    return edit(env, chatId, msgId, t(lang, "upd_done", esc(worker.n)), extra);
  } catch (error) {
    return edit(
      env, chatId, msgId,
      `${t(lang, "upd_fail")}: <i>${esc((error && error.message) || "unknown error")}</i>`,
    );
  } finally {
    token = "";
    ctx.t = "";
  }
}
