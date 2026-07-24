// The Cloudflare install sequence: verify token → account → subdomain → D1 →
// KV → fetch worker.js → deploy → enable → poll. Mirrors novaproxy.online/install.

import { send, edit } from "./telegram.js";
import { bumpInstalls } from "./db.js";
import { t } from "./i18n.js";

const CF = "https://api.cloudflare.com/client/v4";

export const TOKEN_DEEPLINK =
  "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22account_analytics%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22zone%22%2C%22type%22%3A%22read%22%7D%2C%7B%22key%22%3A%22dns%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22ssl_and_certificates%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22zone_settings%22%2C%22type%22%3A%22edit%22%7D%5D&accountId=*&zoneId=all&name=Nova%20Installer";

// Cloudflare API tokens come in two shapes:
//   • legacy: a 40-character [A-Za-z0-9_-] string
//   • current (2026+): a scannable "cfut_" (user) / "cfat_" (account) prefix,
//     then 40 chars, then a checksum, so the whole thing is a single run of
//     [A-Za-z0-9_-] that is LONGER than 40 chars.
// So we never cap at exactly 40, we take the whole contiguous token run
// (40 or more chars). Capping at 40 slices a modern token and Cloudflare then
// rejects it as "Invalid API Token (code 1000)".
export const TOKEN_RE = /^[A-Za-z0-9_-]{40,}$/;

// Pull a token out of a message even if it's surrounded by other text
// (e.g. "here is my token: cfut_…"). Returns the full token or null.
export function extractToken(text) {
  // Drop zero-width / bidi marks a mobile paste (esp. RTL keyboards) can inject.
  const s = (text || "").replace(/[​-‏‪-‮⁦-⁩﻿]/g, "").trim();
  if (TOKEN_RE.test(s)) return s;
  const m = s.match(/(?:cfut_|cfat_)?[A-Za-z0-9_-]{40,}/);
  return m ? m[0] : null;
}

export async function cf(method, path, token, body, ctype) {
  const headers = { Authorization: `Bearer ${token}` };
  if (ctype) headers["Content-Type"] = ctype;
  const r = await fetch(CF + path, { method, headers, body });
  const txt = await r.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
  return { status: r.status, json, text: txt };
}

// Tell novaproxy.online's counter about a real deploy. The id is a hash of the
// panel host, matching the web installer and Nova-Wizard, so the same panel is
// tallied once no matter which channel deployed it. Opaque + best-effort: the
// server never learns the worker URL, and a failure never blocks the deploy.
export async function reportInstall(host) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("nova-panel:" + host));
    const id = "w_" + Array.from(new Uint8Array(buf)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
    await fetch("https://novaproxy.online/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "install", id }),
    });
  } catch {}
}

export const cfOk = (res) => !!(res.json && res.json.success === true);
export function cfErr(res) {
  try {
    const e = res.json && res.json.errors && res.json.errors[0];
    if (e) return `${e.message} (code ${e.code})`;
  } catch {}
  return `HTTP ${res.status}`;
}

export const rand = (n = 6) =>
  Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

function rname() {
  const A = ["sunny", "swift", "atlas", "orbit", "pixel", "falcon", "crystal", "mango",
    "coral", "luna", "pearl", "turbo", "river", "comet"];
  const B = ["panel", "bridge", "node", "core", "wave", "gate", "stack", "vault",
    "portal", "cloud", "garden", "spark"];
  const p = (a) => a[Math.floor(Math.random() * a.length)];
  return `${p(A)}-${p(B)}-${rand(4)}`;
}

const STEP_KEYS = ["verify", "account", "sub", "db", "kv", "fetch", "deploy", "enable", "online"];

export async function install(env, chatId, token, userId, lang = "en") {
  const state = {};
  const render = () =>
    t(lang, "building") + "\n\n" +
    STEP_KEYS.map((k) => {
      const s = state[k];
      const icon = s === "done" ? "✅" : s === "err" ? "❌" : s === "run" ? "⏳" : "▫️";
      return `${icon} ${t(lang, "s_" + k)}`;
    }).join("\n");

  const first = await send(env, chatId, render());
  const statusId = first.result && first.result.message_id;
  const paint = async () => { if (statusId) await edit(env, chatId, statusId, render()); };
  const set = async (k, s) => { state[k] = s; await paint(); };
  const bail = async (k, message) => {
    state[k] = "err";
    await paint();
    await send(env, chatId, `❌ ${message}`);
  };

  try {
    await set("verify", "run");
    const v = await cf("GET", "/user/tokens/verify", token);
    if (!cfOk(v)) {
      const extra = token.length < 40 ? t(lang, "err_short") : "";
      return bail("verify", t(lang, "err_token") + extra + `\n\n<i>${cfErr(v)} · len ${token.length}</i>`);
    }
    await set("verify", "done");

    await set("account", "run");
    const acc = await cf("GET", "/accounts?per_page=50", token);
    if (!cfOk(acc) || !acc.json.result || !acc.json.result.length) return bail("account", cfErr(acc));
    const accountId = acc.json.result[0].id;
    await set("account", "done");

    await set("sub", "run");
    let subName = "";
    const sg = await cf("GET", `/accounts/${accountId}/workers/subdomain`, token);
    if (cfOk(sg) && sg.json.result && sg.json.result.subdomain) subName = sg.json.result.subdomain;
    if (!subName) {
      const want = "nova-" + rand(6);
      const sp = await cf("PUT", `/accounts/${accountId}/workers/subdomain`, token,
        JSON.stringify({ subdomain: want }), "application/json");
      subName = (cfOk(sp) && sp.json.result && sp.json.result.subdomain) || want;
    }
    await set("sub", "done");

    await set("db", "run");
    const dbRes = await cf("POST", `/accounts/${accountId}/d1/database`, token,
      JSON.stringify({ name: "nova-" + rand(6) + "-db" }), "application/json");
    const dbId = dbRes.json && dbRes.json.result && dbRes.json.result.uuid;
    if (!dbId) return bail("db", cfErr(dbRes));
    await set("db", "done");

    await set("kv", "run");
    let kvId = "";
    try {
      const kvRes = await cf("POST", `/accounts/${accountId}/storage/kv/namespaces`, token,
        JSON.stringify({ title: "nova-" + rand(6) + "-kv" }), "application/json");
      kvId = (kvRes.json && kvRes.json.result && kvRes.json.result.id) || "";
    } catch {}
    await set("kv", "done");

    await set("fetch", "run");
    const wjResp = await fetch(env.WORKER_JS_URL);
    if (!wjResp.ok) return bail("fetch", `Could not download worker.js (HTTP ${wjResp.status}).`);
    const workerCode = await wjResp.text();
    if (!workerCode || workerCode.length < 1000 || workerCode.indexOf("export default") < 0) {
      return bail("fetch", "Downloaded worker.js looks invalid.");
    }
    await set("fetch", "done");

    await set("deploy", "run");
    const workerName = "nova-" + rname();
    const bindings = [{ type: "d1", name: "DB", id: dbId }];
    if (kvId) bindings.unshift({ type: "kv_namespace", name: "KV", namespace_id: kvId });
    const metadata = {
      main_module: "worker.js",
      compatibility_date: "2024-09-23",
      compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
      bindings,
    };
    const boundary = "----nova" + rand(12);
    const pre =
      `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n` +
      `Content-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n` +
      `Content-Type: application/javascript+module\r\n\r\n`;
    const post = `\r\n--${boundary}--\r\n`;
    const bodyBlob = new Blob([pre, workerCode, post]);
    const dep = await cf("PUT",
      `/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}`,
      token, bodyBlob, `multipart/form-data; boundary=${boundary}`);
    if (!cfOk(dep)) return bail("deploy", cfErr(dep));
    await set("deploy", "done");

    await set("enable", "run");
    await cf("POST",
      `/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/subdomain`,
      token, JSON.stringify({ enabled: true }), "application/json");
    await set("enable", "done");

    const panelUrl = `https://${workerName}.${subName}.workers.dev`;
    await set("online", "run");
    const online = await waitForOnline(panelUrl);
    await set("online", "done");

    await reportInstall(`${workerName}.${subName}.workers.dev`).catch(() => {});
    if (userId) await bumpInstalls(env, userId).catch(() => {});
    await sendResult(env, chatId, panelUrl, online, lang);
  } catch (e) {
    await send(env, chatId, `❌ ${t(lang, "err_generic")}: <i>${(e && e.message) || "unknown error"}</i>`);
  }
}

// Poll briefly so the result message is always delivered well within a Worker's
// background-execution window. If the panel isn't reachable yet, the result
// shows a "still going live" note rather than the user waiting indefinitely.
async function waitForOnline(url) {
  const deadline = Date.now() + 24000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url + "/install", { cf: { cacheTtl: 0 } });
      if (r.status > 0 && r.status < 500) return true;
    } catch {}
    await new Promise((res) => setTimeout(res, 3000));
  }
  return false;
}

function sendResult(env, chatId, url, online, lang = "en") {
  const text =
    t(lang, "result_title") + "\n\n" +
    `<b>${t(lang, "result_addr")}</b>\n<code>${url}</code>\n\n` +
    t(lang, "result_setpw") +
    (online ? "" : t(lang, "result_slow")) +
    t(lang, "result_iran") +
    t(lang, "result_apps");
  return send(env, chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: t(lang, "btn_setpw"), url: url + "/install", style: "success" }],
        [{ text: t(lang, "btn_open_panel"), url, style: "primary" }],
        [{ text: t(lang, "btn_get_app"), url: "https://github.com/IRNova/Nova-Client/releases" }],
      ],
    },
  });
}
