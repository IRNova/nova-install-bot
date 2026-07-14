// Update router: commands, main menu, FAQ, dynamic sections, contact flow.
// Every user-facing string goes through i18n (English + Persian).

import { tg, send, edit, answerCb, deleteMessage, esc } from "./telegram.js";
import {
  touchUser, getConfig, setConfig, listFaq, getFaq, listSections, getSection,
  markBlocked, getUserLang, setUserLang, isBanned, setBanned,
} from "./db.js";
import { install, TOKEN_DEEPLINK, extractToken } from "./install.js";
import { t, normLang } from "./i18n.js";
import { gatherUserCard } from "./userinfo.js";

export async function handleUpdate(update, env) {
  if (update.callback_query) return handleCallback(update.callback_query, env);
  const msg = update.message || update.edited_message;
  if (!msg || !msg.chat) return;

  // Admin group: /whois looks a user up; a reply to a forwarded message relays
  // back to the user.
  const contactGroup = await getConfig(env, "contact_group_id", "");
  if (contactGroup && String(msg.chat.id) === String(contactGroup)) {
    if ((msg.text || "").toLowerCase().startsWith("/whois")) return whois(env, msg);
    return handleGroupReply(msg, env);
  }

  if (msg.chat.type !== "private") {
    if ((msg.text || "").toLowerCase().startsWith("/id")) {
      await send(env, msg.chat.id, `This chat's ID:\n<code>${msg.chat.id}</code>`);
    }
    return;
  }

  const from = msg.from;
  const chatId = msg.chat.id;
  const lang0 = (await getUserLang(env, from.id)) || normLang(from && from.language_code);

  // Banned users get one short notice and nothing else.
  if (await isBanned(env, from.id)) {
    return send(env, chatId, t(lang0, "banned"));
  }

  await touchUser(env, from, normLang(from && from.language_code)).catch(() => {});
  const lang = lang0;
  const text = (msg.text || "").trim();
  if (!text) return;

  const cmd = text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, "");
  const isCommand = text.startsWith("/");

  // A Cloudflare token anywhere in the message → delete it and install.
  const token = extractToken(text);
  if (token) {
    await deleteMessage(env, chatId, msg.message_id);
    await setConfig(env, `await_token_${from.id}`, "");
    return install(env, chatId, token, from.id, lang);
  }

  // Contact mode: the user's next message goes to the admin group.
  const pendingContact = await getConfig(env, `await_contact_${from.id}`, "");
  if (pendingContact === "1" && !isCommand) {
    await setConfig(env, `await_contact_${from.id}`, "");
    return forwardContact(env, from, chatId, msg, lang);
  }

  // Awaiting a token (user tapped Install): a non-command reply that isn't a
  // valid token gets a clear "that's not a token" explanation instead of the
  // menu, so people aren't left wondering why nothing happened.
  const pendingToken = await getConfig(env, `await_token_${from.id}`, "");
  if (pendingToken === "1" && !isCommand) {
    await deleteMessage(env, chatId, msg.message_id);
    return send(env, chatId, t(lang, "not_a_token"), { reply_markup: installKeyboard(lang, true) });
  }

  switch (cmd) {
    case "/start":
    case "/menu":
    case "/help":
      return sendMenu(env, chatId, from, lang);
    case "/install":
      await setConfig(env, `await_token_${from.id}`, "1");
      return send(env, chatId, t(lang, "install_text"), { reply_markup: installKeyboard(lang, true) });
    case "/lang":
      return toggleLang(env, chatId, from.id, lang, null);
    case "/id":
      return send(env, chatId, `Your ID: <code>${from.id}</code>\nChat ID: <code>${chatId}</code>`);
    case "/contact":
      return startContact(env, chatId, from.id, lang);
    case "/faq":
      return sendFaqList(env, chatId, lang);
    default:
      return sendMenu(env, chatId, from, lang);
  }
}

// ── Main menu ───────────────────────────────────────────────────────────────

async function menuMarkup(env, lang) {
  const rows = [[{ text: t(lang, "btn_install"), callback_data: "install" }]];
  if ((await getConfig(env, "faq_enabled", "1")) === "1") {
    const faq = await listFaq(env);
    if (faq.length) rows.push([{ text: t(lang, "btn_faq"), callback_data: "faq" }]);
  }
  for (const s of await listSections(env)) rows.push([{ text: s.title, callback_data: `sec:${s.id}` }]);
  rows.push([{ text: t(lang, "btn_apps"), callback_data: "apps" }]);
  if ((await getConfig(env, "contact_enabled", "1")) === "1") {
    rows.push([{ text: t(lang, "btn_contact"), callback_data: "contact" }]);
  }
  rows.push([{ text: t(lang, "btn_lang"), callback_data: "lang" }]);
  return { inline_keyboard: rows };
}

async function menuText(env, from, lang) {
  const welcome = (await getConfig(env, "welcome_" + lang, "")).trim() ||
    (await getConfig(env, "welcome", "")).trim();
  const hi = from && from.first_name ? esc(from.first_name) : (lang === "fa" ? "دوست عزیز" : "there");
  return welcome || `${t(lang, "menu_hi", hi)}\n\n${t(lang, "menu_body")}`;
}

async function sendMenu(env, chatId, from, lang) {
  return send(env, chatId, await menuText(env, from, lang), { reply_markup: await menuMarkup(env, lang) });
}

async function replaceWithMenu(env, chatId, msgId, from, lang) {
  return edit(env, chatId, msgId, await menuText(env, from, lang), { reply_markup: await menuMarkup(env, lang) });
}

function backRow(lang) {
  return [{ text: t(lang, "btn_back_menu"), callback_data: "menu" }];
}

// ── Language ────────────────────────────────────────────────────────────────

async function toggleLang(env, chatId, userId, lang, msgId) {
  const next = lang === "fa" ? "en" : "fa";
  await setUserLang(env, userId, next);
  const from = { first_name: "" };
  if (msgId) return replaceWithMenu(env, chatId, msgId, from, next);
  await send(env, chatId, t(next, "lang_set"));
  return sendMenu(env, chatId, from, next);
}

// ── Callbacks ───────────────────────────────────────────────────────────────

async function handleCallback(cb, env) {
  const data = cb.data || "";
  const chatId = cb.message && cb.message.chat && cb.message.chat.id;
  const msgId = cb.message && cb.message.message_id;

  // Ban / unban from the admin group (the Block button on a forwarded message).
  if (data.startsWith("ban:") || data.startsWith("unban:")) {
    const group = await getConfig(env, "contact_group_id", "");
    if (!group || String(chatId) !== String(group)) return answerCb(env, cb.id);
    const ban = data.startsWith("ban:");
    const targetId = Number(data.split(":")[1]);
    await setBanned(env, targetId, ban);
    await answerCb(env, cb.id, ban ? "User blocked" : "User unblocked");
    await tg(env, "editMessageReplyMarkup", {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [[{
        text: ban ? "✅ Unblock user" : "🚫 Block user",
        callback_data: `${ban ? "unban" : "ban"}:${targetId}`,
      }]] },
    }).catch(() => {});
    return;
  }

  await touchUser(env, cb.from, normLang(cb.from && cb.from.language_code)).catch(() => {});
  const lang = (await getUserLang(env, cb.from.id)) || normLang(cb.from && cb.from.language_code);
  await answerCb(env, cb.id);

  if (data === "menu") return replaceWithMenu(env, chatId, msgId, cb.from, lang);
  if (data === "lang") return toggleLang(env, chatId, cb.from.id, lang, msgId);
  if (data === "install") {
    await setConfig(env, `await_token_${cb.from.id}`, "1");
    return edit(env, chatId, msgId, t(lang, "install_text"), { reply_markup: installKeyboard(lang, true) });
  }
  if (data === "apps")
    return edit(env, chatId, msgId, t(lang, "apps_title"), { reply_markup: appsKeyboard(lang) });
  if (data === "faq") return editFaqList(env, chatId, msgId, lang);
  if (data === "contact") { await startContact(env, chatId, cb.from.id, lang); return; }
  if (data.startsWith("faq:")) return editFaqAnswer(env, chatId, msgId, +data.slice(4), lang);
  if (data.startsWith("sec:")) return editSection(env, chatId, msgId, +data.slice(4), lang);
}

// ── Install intro ───────────────────────────────────────────────────────────

function installKeyboard(lang, withBack) {
  const rows = [
    [{ text: t(lang, "btn_get_token"), url: TOKEN_DEEPLINK }],
    [{ text: t(lang, "btn_make_account"), url: "https://dash.cloudflare.com/sign-up" }],
  ];
  if (withBack) rows.push(backRow(lang));
  return { inline_keyboard: rows };
}

// ── Apps ────────────────────────────────────────────────────────────────────

function appsKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, "btn_android"), url: "https://github.com/IRNova/Nova-Client/releases/latest/download/nova-client.apk" }],
      [{ text: t(lang, "btn_all_dl"), url: "https://github.com/IRNova/Nova-Client/releases" }],
      backRow(lang),
    ],
  };
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

async function faqListMarkup(env, lang) {
  const faq = await listFaq(env);
  const rows = faq.map((f) => [{ text: f.question, callback_data: `faq:${f.id}` }]);
  rows.push(backRow(lang));
  return { text: faq.length ? t(lang, "faq_title") : t(lang, "faq_empty"), markup: { inline_keyboard: rows } };
}
async function sendFaqList(env, chatId, lang) {
  const { text, markup } = await faqListMarkup(env, lang);
  return send(env, chatId, text, { reply_markup: markup });
}
async function editFaqList(env, chatId, msgId, lang) {
  const { text, markup } = await faqListMarkup(env, lang);
  return edit(env, chatId, msgId, text, { reply_markup: markup });
}
async function editFaqAnswer(env, chatId, msgId, id, lang) {
  const f = await getFaq(env, id);
  if (!f) return editFaqList(env, chatId, msgId, lang);
  const text = `❓ <b>${esc(f.question)}</b>\n\n${f.answer}`;
  return edit(env, chatId, msgId, text, {
    reply_markup: { inline_keyboard: [[{ text: t(lang, "btn_back_faq"), callback_data: "faq" }], backRow(lang)] },
  });
}

// ── Dynamic sections ────────────────────────────────────────────────────────

async function editSection(env, chatId, msgId, id, lang) {
  const s = await getSection(env, id);
  if (!s) return replaceWithMenu(env, chatId, msgId, null, lang);
  const rows = [];
  if (s.button_text && s.button_url) rows.push([{ text: s.button_text, url: s.button_url }]);
  rows.push(backRow(lang));
  return edit(env, chatId, msgId, `<b>${esc(s.title)}</b>\n\n${s.body}`, {
    reply_markup: { inline_keyboard: rows },
  });
}

// ── Contact flow ────────────────────────────────────────────────────────────

async function startContact(env, chatId, userId, lang) {
  if ((await getConfig(env, "contact_enabled", "1")) !== "1") {
    return send(env, chatId, t(lang, "contact_disabled"));
  }
  await setConfig(env, `await_contact_${userId}`, "1");
  return send(env, chatId, t(lang, "contact_start"));
}

async function forwardContact(env, from, chatId, msg, lang) {
  const group = await getConfig(env, "contact_group_id", "");
  if (!group) return send(env, chatId, t(lang, "contact_notset"));

  const card = await gatherUserCard(env, from.id, from);
  const header =
    `✉️ <b>New message</b>\n\n` +
    `“${esc(msg.text || "")}”\n\n` +
    card.text +
    `\n\n<i>Reply to this message to answer them.</i>`;
  const kb = { inline_keyboard: [[{ text: "🚫 Block user", callback_data: `ban:${from.id}` }]] };

  // The message admins reply to (mapped back to the user). Photo goes as a
  // separate follow-up so the caption length limit never truncates the card.
  const sent = await send(env, group, header, { reply_markup: kb });
  if (sent && sent.result && sent.result.message_id) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO contact_map (group_msg_id, user_id) VALUES (?, ?)"
    ).bind(sent.result.message_id, from.id).run();
    if (card.photo) {
      await tg(env, "sendPhoto", {
        chat_id: group, photo: card.photo, caption: `📷 ${esc(from.first_name || "user")}`,
        reply_to_message_id: sent.result.message_id,
      }).catch(() => {});
    }
  }
  return send(env, chatId, t(lang, "contact_sent"), { reply_markup: { inline_keyboard: [backRow(lang)] } });
}

// /whois <id> in the admin group, or /whois as a reply to a forwarded message.
async function whois(env, msg) {
  const group = msg.chat.id;
  let targetId = null;
  const parts = (msg.text || "").trim().split(/\s+/);
  if (parts[1] && /^\d+$/.test(parts[1])) targetId = Number(parts[1]);
  if (!targetId && msg.reply_to_message) {
    const row = await env.DB.prepare(
      "SELECT user_id FROM contact_map WHERE group_msg_id = ?"
    ).bind(msg.reply_to_message.message_id).first();
    if (row) targetId = row.user_id;
  }
  if (!targetId) {
    return send(env, group, "Usage: <code>/whois &lt;user id&gt;</code>, or reply <code>/whois</code> to a forwarded message.");
  }
  const card = await gatherUserCard(env, targetId, null);
  const banned = await isBanned(env, targetId);
  const kb = { inline_keyboard: [[{
    text: banned ? "✅ Unblock user" : "🚫 Block user",
    callback_data: `${banned ? "unban" : "ban"}:${targetId}`,
  }]] };
  const sent = await send(env, group, card.text, { reply_markup: kb });
  if (card.photo) {
    await tg(env, "sendPhoto", { chat_id: group, photo: card.photo,
      reply_to_message_id: sent && sent.result && sent.result.message_id }).catch(() => {});
  }
}

async function handleGroupReply(msg, env) {
  const reply = msg.reply_to_message;
  if (!reply || !msg.text) return;
  const row = await env.DB.prepare(
    "SELECT user_id FROM contact_map WHERE group_msg_id = ?"
  ).bind(reply.message_id).first();
  if (!row) return;
  const userId = row.user_id;
  const lang = (await getUserLang(env, userId)) || "en";
  const res = await send(env, userId, `${t(lang, "reply_prefix")}\n\n${esc(msg.text)}`);
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
