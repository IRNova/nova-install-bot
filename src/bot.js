// Update router: commands, main menu, FAQ, dynamic sections, contact flow.

import { tg, send, edit, answerCb, deleteMessage, esc } from "./telegram.js";
import {
  touchUser, getConfig, setConfig, listFaq, getFaq, listSections, getSection, markBlocked,
} from "./db.js";
import { install, TOKEN_DEEPLINK, TOKEN_RE } from "./install.js";

export async function handleUpdate(update, env) {
  if (update.callback_query) return handleCallback(update.callback_query, env);
  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;

  // Messages inside the admin group: an admin replying to a forwarded contact
  // message relays back to the user.
  const contactGroup = await getConfig(env, "contact_group_id", "");
  if (contactGroup && String(msg.chat.id) === String(contactGroup)) {
    return handleGroupReply(msg, env);
  }

  if (msg.chat.type !== "private") {
    // In any other group, only answer /id so admins can discover the chat id.
    if ((msg.text || "").toLowerCase().startsWith("/id")) {
      await send(env, msg.chat.id, `This chat's ID:\n<code>${msg.chat.id}</code>`);
    }
    return;
  }

  const from = msg.from;
  await touchUser(env, from).catch(() => {});
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  if (!text) return;

  // Pasted Cloudflare token → delete + install.
  if (TOKEN_RE.test(text)) {
    await deleteMessage(env, chatId, msg.message_id);
    return install(env, chatId, text, from.id);
  }

  const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");

  // A user in "contact" mode: their next message goes to the admin group.
  const pending = await getConfig(env, `await_contact_${from.id}`, "");
  if (pending === "1" && !text.startsWith("/")) {
    await setConfig(env, `await_contact_${from.id}`, "");
    return forwardContact(env, from, chatId, msg);
  }

  switch (cmd) {
    case "/start":
    case "/menu":
      return sendMenu(env, chatId, from);
    case "/install":
      return sendInstallIntro(env, chatId);
    case "/help":
      return sendMenu(env, chatId, from);
    case "/id":
      return send(env, chatId, `Your ID: <code>${from.id}</code>\nChat ID: <code>${chatId}</code>`);
    case "/contact":
      return startContact(env, chatId, from.id);
    case "/faq":
      return sendFaqList(env, chatId);
    default:
      return sendMenu(env, chatId, from);
  }
}

// ── Main menu ───────────────────────────────────────────────────────────────

async function sendMenu(env, chatId, from) {
  const welcome = (await getConfig(env, "welcome", "")).trim();
  const hi = from && from.first_name ? esc(from.first_name) : "there";
  const text = welcome ||
    `👋 Hi ${hi}!\n\n` +
    "I'm the <b>Nova</b> bot. I can build your own Nova proxy panel on your Cloudflare account in about a minute, answer common questions, and connect you with our team.\n\n" +
    "Pick an option below.";

  const rows = [[{ text: "🚀 Install my Nova panel", callback_data: "install" }]];

  if ((await getConfig(env, "faq_enabled", "1")) === "1") {
    const faq = await listFaq(env);
    if (faq.length) rows.push([{ text: "❓ FAQ", callback_data: "faq" }]);
  }

  // Dynamic admin-defined sections.
  const sections = await listSections(env);
  for (const s of sections) rows.push([{ text: s.title, callback_data: `sec:${s.id}` }]);

  rows.push([{ text: "📱 Get the Nova app", callback_data: "apps" }]);

  if ((await getConfig(env, "contact_enabled", "1")) === "1") {
    rows.push([{ text: "✉️ Contact us", callback_data: "contact" }]);
  }

  return send(env, chatId, text, { reply_markup: { inline_keyboard: rows } });
}

function menuButton() {
  return [{ text: "⬅️ Back to menu", callback_data: "menu" }];
}

// ── Callbacks ───────────────────────────────────────────────────────────────

async function handleCallback(cb, env) {
  const data = cb.data || "";
  const chatId = cb.message && cb.message.chat && cb.message.chat.id;
  const msgId = cb.message && cb.message.message_id;
  await touchUser(env, cb.from).catch(() => {});
  await answerCb(env, cb.id);

  if (data === "menu") return replaceWithMenu(env, chatId, msgId, cb.from);
  if (data === "install") return editInstallIntro(env, chatId, msgId);
  if (data === "apps") return editApps(env, chatId, msgId);
  if (data === "faq") return editFaqList(env, chatId, msgId);
  if (data === "contact") { await startContact(env, chatId, cb.from.id); return; }
  if (data.startsWith("faq:")) return editFaqAnswer(env, chatId, msgId, +data.slice(4));
  if (data.startsWith("sec:")) return editSection(env, chatId, msgId, +data.slice(4));
}

async function replaceWithMenu(env, chatId, msgId, from) {
  // Rebuild the menu in place.
  const welcome = (await getConfig(env, "welcome", "")).trim();
  const hi = from && from.first_name ? esc(from.first_name) : "there";
  const text = welcome ||
    `👋 Hi ${hi}!\n\nPick an option below.`;
  const rows = [[{ text: "🚀 Install my Nova panel", callback_data: "install" }]];
  if ((await getConfig(env, "faq_enabled", "1")) === "1") {
    const faq = await listFaq(env);
    if (faq.length) rows.push([{ text: "❓ FAQ", callback_data: "faq" }]);
  }
  for (const s of await listSections(env)) rows.push([{ text: s.title, callback_data: `sec:${s.id}` }]);
  rows.push([{ text: "📱 Get the Nova app", callback_data: "apps" }]);
  if ((await getConfig(env, "contact_enabled", "1")) === "1") {
    rows.push([{ text: "✉️ Contact us", callback_data: "contact" }]);
  }
  return edit(env, chatId, msgId, text, { reply_markup: { inline_keyboard: rows } });
}

// ── Install intro ───────────────────────────────────────────────────────────

const INSTALL_TEXT =
  "🚀 <b>Install Nova</b>\n\n" +
  "I'll build your own Nova panel on <b>your</b> Cloudflare account — worker and database, fully set up. About a minute.\n\n" +
  "<b>1.</b> Need a free Cloudflare account? Make one first (1 min).\n\n" +
  "<b>2.</b> Tap <b>Get my token</b>. A Cloudflare page opens, already filled in.\n" +
  "   • Scroll to the bottom → <b>Continue to summary</b>\n" +
  "   • Tap <b>Create Token</b>, then <b>Copy</b> the long code\n" +
  "   ⚠️ Copy the whole code — it's shown only once.\n\n" +
  "<b>3.</b> Paste the token here in the chat. I delete it the moment it arrives and never store it.\n\n" +
  "🇮🇷 In Iran: if the Cloudflare page won't open, turn on your current VPN first.";

function installKeyboard(withBack) {
  const rows = [
    [{ text: "🔑 Get my token", url: TOKEN_DEEPLINK }],
    [{ text: "Create a free Cloudflare account", url: "https://dash.cloudflare.com/sign-up" }],
  ];
  if (withBack) rows.push(menuButton());
  return { inline_keyboard: rows };
}

function sendInstallIntro(env, chatId) {
  return send(env, chatId, INSTALL_TEXT, { reply_markup: installKeyboard(true) });
}
function editInstallIntro(env, chatId, msgId) {
  return edit(env, chatId, msgId, INSTALL_TEXT, { reply_markup: installKeyboard(true) });
}

// ── Apps ────────────────────────────────────────────────────────────────────

const APPS_TEXT =
  "📱 <b>Get the Nova app</b>\n\n" +
  "Install Nova Client, import your subscription link from your panel, and connect.";
function appsKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🤖 Android (APK)", url: "https://github.com/IRNova/Nova-Client/releases/latest/download/nova-client.apk" }],
      [{ text: "💻 All downloads (Win / macOS / more)", url: "https://github.com/IRNova/Nova-Client/releases" }],
      menuButton(),
    ],
  };
}
function editApps(env, chatId, msgId) {
  return edit(env, chatId, msgId, APPS_TEXT, { reply_markup: appsKeyboard() });
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

async function faqListMarkup(env) {
  const faq = await listFaq(env);
  const rows = faq.map((f) => [{ text: f.question, callback_data: `faq:${f.id}` }]);
  rows.push(menuButton());
  return { text: faq.length ? "❓ <b>Frequently asked questions</b>\n\nTap a question:" :
    "No questions yet — tap Contact us to ask.", markup: { inline_keyboard: rows } };
}
async function sendFaqList(env, chatId) {
  const { text, markup } = await faqListMarkup(env);
  return send(env, chatId, text, { reply_markup: markup });
}
async function editFaqList(env, chatId, msgId) {
  const { text, markup } = await faqListMarkup(env);
  return edit(env, chatId, msgId, text, { reply_markup: markup });
}
async function editFaqAnswer(env, chatId, msgId, id) {
  const f = await getFaq(env, id);
  if (!f) return editFaqList(env, chatId, msgId);
  const text = `❓ <b>${esc(f.question)}</b>\n\n${f.answer}`;
  return edit(env, chatId, msgId, text, {
    reply_markup: { inline_keyboard: [[{ text: "⬅️ Back to questions", callback_data: "faq" }], menuButton()] },
  });
}

// ── Dynamic sections ────────────────────────────────────────────────────────

async function editSection(env, chatId, msgId, id) {
  const s = await getSection(env, id);
  if (!s) return replaceWithMenu(env, chatId, msgId, null);
  const rows = [];
  if (s.button_text && s.button_url) rows.push([{ text: s.button_text, url: s.button_url }]);
  rows.push(menuButton());
  return edit(env, chatId, msgId, `<b>${esc(s.title)}</b>\n\n${s.body}`, {
    reply_markup: { inline_keyboard: rows },
  });
}

// ── Contact flow ────────────────────────────────────────────────────────────

async function startContact(env, chatId, userId) {
  if ((await getConfig(env, "contact_enabled", "1")) !== "1") {
    return send(env, chatId, "Contact is currently disabled. Please try again later.");
  }
  await setConfig(env, `await_contact_${userId}`, "1");
  return send(env, chatId,
    "✉️ <b>Contact us</b>\n\nType your message and send it. It goes straight to our team, and we'll reply here.\n\nSend /menu to cancel.");
}

async function forwardContact(env, from, chatId, msg) {
  const group = await getConfig(env, "contact_group_id", "");
  if (!group) {
    return send(env, chatId, "Thanks! But contact isn't set up yet. Please try again later.");
  }
  const uname = from.username ? `@${from.username}` : "(no username)";
  const header =
    `✉️ <b>New message</b>\n` +
    `From: ${esc(from.first_name || "")} ${uname}\n` +
    `User ID: <code>${from.id}</code>\n` +
    `<i>Reply to this message to answer them.</i>\n\n` +
    esc(msg.text || "");
  const sent = await send(env, group, header);
  if (sent && sent.result && sent.result.message_id) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO contact_map (group_msg_id, user_id) VALUES (?, ?)"
    ).bind(sent.result.message_id, from.id).run();
  }
  return send(env, chatId, "✅ Sent! Our team will get back to you here.", {
    reply_markup: { inline_keyboard: [menuButton()] },
  });
}

// An admin replying (in the group) to a forwarded contact message → relay to user.
async function handleGroupReply(msg, env) {
  const reply = msg.reply_to_message;
  if (!reply || !msg.text) return;
  const row = await env.DB.prepare(
    "SELECT user_id FROM contact_map WHERE group_msg_id = ?"
  ).bind(reply.message_id).first();
  if (!row) return; // not a reply to a tracked contact message
  const userId = row.user_id;
  const res = await send(env, userId, `💬 <b>Reply from the Nova team:</b>\n\n${esc(msg.text)}`);
  if (res && res.ok === false) {
    if (res.error_code === 403) await markBlocked(env, userId);
    await send(env, msg.chat.id, `⚠️ Couldn't deliver (user may have blocked the bot).`, {
      reply_to_message_id: msg.message_id,
    });
  } else {
    await tg(env, "setMessageReaction", {
      chat_id: msg.chat.id, message_id: msg.message_id, reaction: [{ type: "emoji", emoji: "👍" }],
    }).catch(() => {});
  }
}
