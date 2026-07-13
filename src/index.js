// Nova Install Bot — deploys the Nova panel to a user's own Cloudflare account
// straight from a Telegram chat. It mirrors novaproxy.online/install: the user
// pastes one Cloudflare API token, the bot runs the same nine Cloudflare API
// calls (verify → account → subdomain → D1 → KV → fetch worker → deploy →
// enable → poll), then hands back the panel URL.
//
// The bot is stateless. It recognises a pasted Cloudflare token by shape, so
// there is no per-chat session to store. The message carrying the token is
// deleted the instant it arrives, and the token itself is only ever held in a
// local variable for the duration of one install. Nothing is logged or stored.

const CF = "https://api.cloudflare.com/client/v4";

// Pre-filled Cloudflare token page: Workers Scripts (edit), Workers KV (edit),
// D1 (edit), Account Settings (read). Same permission set the website uses.
const TOKEN_DEEPLINK =
  "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22workers_kv_storage%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&accountId=*&zoneId=all&name=Nova%20Installer";

// A Cloudflare API token is 40 chars from [A-Za-z0-9_-]. Match a whole-message
// token so ordinary chatter never triggers an install.
const TOKEN_RE = /^[A-Za-z0-9_-]{40}$/;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("Nova Install Bot is running.", { status: 200 });
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      // Only Telegram (which knows the secret) may call the webhook.
      if (env.WEBHOOK_SECRET &&
          request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      let update;
      try { update = await request.json(); } catch { return new Response("ok"); }
      // Answer Telegram immediately; do the slow install work in the background.
      ctx.waitUntil(handleUpdate(update, env).catch(() => {}));
      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  },
};

// ── Telegram helpers ────────────────────────────────────────────────────────

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

function send(env, chatId, text, extra = {}) {
  return tg(env, "sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML",
    disable_web_page_preview: true, ...extra,
  });
}

function edit(env, chatId, messageId, text, extra = {}) {
  return tg(env, "editMessageText", {
    chat_id: chatId, message_id: messageId, text, parse_mode: "HTML",
    disable_web_page_preview: true, ...extra,
  });
}

// ── Update router ───────────────────────────────────────────────────────────

async function handleUpdate(update, env) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text) return;

  // A pasted Cloudflare token: delete it from the chat at once, then install.
  if (TOKEN_RE.test(text)) {
    await tg(env, "deleteMessage", { chat_id: chatId, message_id: msg.message_id }).catch(() => {});
    return install(env, chatId, text);
  }

  const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
  if (cmd === "/start" || cmd === "/install" || cmd === "/help") {
    return sendIntro(env, chatId);
  }

  // Anything else: gentle nudge.
  return send(env, chatId,
    "Send /install to set up your Nova panel, or paste your Cloudflare token when you have it.");
}

// ── Intro / instructions ────────────────────────────────────────────────────

function sendIntro(env, chatId) {
  const text =
    "🚀 <b>Install Nova</b>\n\n" +
    "I'll build your own Nova panel on <b>your</b> Cloudflare account — the worker and database, fully set up. It takes about a minute.\n\n" +
    "<b>1.</b> Need a free Cloudflare account? Make one first (1 min): https://dash.cloudflare.com/sign-up\n\n" +
    "<b>2.</b> Tap <b>Get my token</b> below. A Cloudflare page opens, already filled in.\n" +
    "   • Scroll to the bottom → <b>Continue to summary</b>\n" +
    "   • Tap <b>Create Token</b>, then <b>Copy</b> the long code\n" +
    "   ⚠️ Copy the whole code — it's shown only once.\n\n" +
    "<b>3.</b> Paste the token here in the chat. I delete it the moment it arrives and never store it.\n\n" +
    "🇮🇷 In Iran: if the Cloudflare page won't open, turn on your current VPN first.";
  return send(env, chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔑 Get my token", url: TOKEN_DEEPLINK }],
        [{ text: "Create a free Cloudflare account", url: "https://dash.cloudflare.com/sign-up" }],
      ],
    },
  });
}

// ── Cloudflare API helper ───────────────────────────────────────────────────

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

// ── The install sequence ────────────────────────────────────────────────────

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

async function install(env, chatId, token) {
  // A single status message we keep editing, so the chat stays tidy.
  const state = {}; // step key -> 'run' | 'done' | 'err'
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
    // 1) Verify token
    await set("verify", "run");
    const v = await cf("GET", "/user/tokens/verify", token);
    if (!cfOk(v)) {
      const extra = token.length < 30 ? " (the token looks too short — the copy was probably cut off)" : "";
      return bail("verify",
        "That token didn't work. Make sure you created it with the Cloudflare Workers template " +
        "and copied all of it." + extra + `\n\n<i>${cfErr(v)}</i>`);
    }
    await set("verify", "done");

    // 2) Account
    await set("account", "run");
    const acc = await cf("GET", "/accounts?per_page=50", token);
    if (!cfOk(acc) || !acc.json.result || !acc.json.result.length) {
      return bail("account", cfErr(acc));
    }
    const accountId = acc.json.result[0].id;
    await set("account", "done");

    // 3) workers.dev subdomain
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

    // 4) D1 database
    await set("db", "run");
    const dbRes = await cf("POST", `/accounts/${accountId}/d1/database`, token,
      JSON.stringify({ name: "nova-" + rand(6) + "-db" }), "application/json");
    const dbId = dbRes.json && dbRes.json.result && dbRes.json.result.uuid;
    if (!dbId) return bail("db", cfErr(dbRes));
    await set("db", "done");

    // 5) KV namespace (optional — worker falls back to a D1-backed shim without it)
    await set("kv", "run");
    let kvId = "";
    try {
      const kvRes = await cf("POST", `/accounts/${accountId}/storage/kv/namespaces`, token,
        JSON.stringify({ title: "nova-" + rand(6) + "-kv" }), "application/json");
      kvId = (kvRes.json && kvRes.json.result && kvRes.json.result.id) || "";
    } catch {}
    await set("kv", "done");

    // 6) Download the latest worker.js
    await set("fetch", "run");
    const wjResp = await fetch(env.WORKER_JS_URL);
    if (!wjResp.ok) return bail("fetch", `Could not download worker.js (HTTP ${wjResp.status}).`);
    const workerCode = await wjResp.text();
    if (!workerCode || workerCode.length < 1000 || workerCode.indexOf("export default") < 0) {
      return bail("fetch", "Downloaded worker.js looks invalid.");
    }
    await set("fetch", "done");

    // 7) Deploy the worker with the storage bindings.
    // We intentionally do NOT bind UUID/KEY: the worker reads an env KEY as a
    // pre-set admin password, so leaving it out sends the user to /install to
    // choose their own. Only D1 (and KV if we made one) get bound.
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

    // 8) Enable the workers.dev route
    await set("enable", "run");
    await cf("POST",
      `/accounts/${accountId}/workers/scripts/${encodeURIComponent(workerName)}/subdomain`,
      token, JSON.stringify({ enabled: true }), "application/json");
    await set("enable", "done");

    // 9) Poll until the new URL responds (fresh worker + subdomain: ~1-3 min)
    const panelUrl = `https://${workerName}.${subName}.workers.dev`;
    await set("online", "run");
    const online = await waitForOnline(panelUrl);
    await set("online", "done");

    await sendResult(env, chatId, panelUrl, online);
  } catch (e) {
    await send(env, chatId, `❌ Something went wrong: <i>${(e && e.message) || "unknown error"}</i>`);
  }
}

async function waitForOnline(url) {
  const deadline = Date.now() + 150000; // up to ~2.5 min
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
