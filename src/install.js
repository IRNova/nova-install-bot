// The Cloudflare install sequence: verify token → account → subdomain → D1 →
// KV → fetch worker.js → deploy → enable → poll. Mirrors novaproxy.online/install.

import { send, edit } from "./telegram.js";
import { bumpInstalls } from "./db.js";

const CF = "https://api.cloudflare.com/client/v4";

export const TOKEN_DEEPLINK =
  "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&accountId=*&zoneId=all&name=Nova%20Installer";

// A Cloudflare API token is 40 chars from [A-Za-z0-9_-].
export const TOKEN_RE = /^[A-Za-z0-9_-]{40}$/;

async function cf(method, path, token, body, ctype) {
  const headers = { Authorization: `Bearer ${token}` };
  if (ctype) headers["Content-Type"] = ctype;
  const r = await fetch(CF + path, { method, headers, body });
  const txt = await r.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
  return { status: r.status, json, text: txt };
}

const cfOk = (res) => !!(res.json && res.json.success === true);
function cfErr(res) {
  try {
    const e = res.json && res.json.errors && res.json.errors[0];
    if (e) return `${e.message} (code ${e.code})`;
  } catch {}
  return `HTTP ${res.status}`;
}

const rand = (n = 6) =>
  Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");

function rname() {
  const A = ["sunny", "swift", "atlas", "orbit", "pixel", "falcon", "crystal", "mango",
    "coral", "luna", "pearl", "turbo", "river", "comet"];
  const B = ["panel", "bridge", "node", "core", "wave", "gate", "stack", "vault",
    "portal", "cloud", "garden", "spark"];
  const p = (a) => a[Math.floor(Math.random() * a.length)];
  return `${p(A)}-${p(B)}-${rand(4)}`;
}

const STEPS = [
  ["verify", "Checking your token"],
  ["account", "Finding your account"],
  ["sub", "Setting up your subdomain"],
  ["db", "Creating the database"],
  ["kv", "Creating storage"],
  ["fetch", "Downloading the latest Nova"],
  ["deploy", "Deploying the worker"],
  ["enable", "Turning it on"],
  ["online", "Waiting for it to come online"],
];

export async function install(env, chatId, token, userId) {
  const state = {};
  const render = () =>
    "🛠 <b>Building your Nova…</b>\n\n" +
    STEPS.map(([k, label]) => {
      const s = state[k];
      const icon = s === "done" ? "✅" : s === "err" ? "❌" : s === "run" ? "⏳" : "▫️";
      return `${icon} ${label}`;
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
      const extra = token.length < 30 ? " (the token looks too short — the copy was probably cut off)" : "";
      return bail("verify",
        "That token didn't work. Make sure you created it with the Cloudflare Workers template " +
        "and copied all of it." + extra + `\n\n<i>${cfErr(v)}</i>`);
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

    if (userId) await bumpInstalls(env, userId).catch(() => {});
    await sendResult(env, chatId, panelUrl, online);
  } catch (e) {
    await send(env, chatId, `❌ Something went wrong: <i>${(e && e.message) || "unknown error"}</i>`);
  }
}

async function waitForOnline(url) {
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url + "/install", { cf: { cacheTtl: 0 } });
      if (r.status > 0 && r.status < 500) return true;
    } catch {}
    await new Promise((res) => setTimeout(res, 4000));
  }
  return false;
}

function sendResult(env, chatId, url, online) {
  const slow = online
    ? ""
    : "\n\n⏳ Your panel is still going live worldwide — Cloudflare can take 1-3 minutes for a new address. " +
      "If the link errors at first, wait a minute and refresh.";
  const text =
    "🎉 <b>Your Nova is ready!</b>\n\n" +
    `<b>Your address:</b>\n<code>${url}</code>\n\n` +
    "First, set your admin password using the button below." +
    slow +
    "\n\n🇮🇷 <b>In Iran:</b> workers.dev is filtered — in Cloudflare, add a Custom Domain " +
    "(Workers → your worker → Settings → Domains & Routes) and use that instead.\n\n" +
    "📱 Then install <b>Nova Client</b>, import your subscription link from the panel, and connect.";
  return send(env, chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔓 Set my admin password", url: url + "/install" }],
        [{ text: "🌐 Open my panel", url }],
        [{ text: "📱 Get the Nova app", url: "https://github.com/IRNova/Nova-Client/releases" }],
      ],
    },
  });
}
