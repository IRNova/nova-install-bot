// Update router: commands, main menu, FAQ, dynamic sections, contact flow.
// Every user-facing string goes through i18n (English + Persian).

import { tg, send, edit, sendPhoto, editCaption, answerCb, deleteMessage, esc } from "./telegram.js";
import {
  touchUser, getConfig, setConfig, listFaq, getFaq, listSections, getSection,
  markBlocked, getUserLang, setUserLang, isBanned, setBanned,
  logQuestion, setQaAnswer, setQaAnswerByCard, markQaResolved, getQa,
} from "./db.js";
import { aiEnabled, autoAnswer } from "./ai.js";
import { install, TOKEN_DEEPLINK, extractToken } from "./install.js";
import { startUpdate, runUpdate, loadUpdCtx, clearUpdCtx } from "./update.js";
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

  // Channel gate: everything below needs membership in our channel.
  const gate = await requireMember(env, from.id);
  if (!gate.ok) {
    return send(env, chatId, t(lang, "join_text"), { reply_markup: joinKeyboard(lang, gate.chan) });
  }

  // A Cloudflare token anywhere in the message → delete it, then install or
  // (if the user came from "Update my panel") update.
  const token = extractToken(text);
  if (token) {
    await deleteMessage(env, chatId, msg.message_id);
    const wantUpdate = (await getConfig(env, `await_utoken_${from.id}`, "")) === "1";
    await setConfig(env, `await_token_${from.id}`, "");
    await setConfig(env, `await_utoken_${from.id}`, "");
    if (wantUpdate) return startUpdate(env, chatId, token, from.id, lang);
    return install(env, chatId, token, from.id, lang);
  }

  // Contact mode: the user's next message is answered by the AI assistant
  // when it is confident, otherwise it goes to the admin group.
  const pendingContact = await getConfig(env, `await_contact_${from.id}`, "");
  if (pendingContact === "1" && !isCommand) {
    await setConfig(env, `await_contact_${from.id}`, "");
    return handleContactMessage(env, from, chatId, msg, lang);
  }

  // Awaiting a token (user tapped Install or Update): a non-command reply that
  // isn't a valid token gets a clear "that's not a token" explanation instead
  // of the menu, so people aren't left wondering why nothing happened.
  const pendingToken = await getConfig(env, `await_token_${from.id}`, "");
  const pendingUpd = await getConfig(env, `await_utoken_${from.id}`, "");
  if ((pendingToken === "1" || pendingUpd === "1") && !isCommand) {
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
      await setConfig(env, `await_utoken_${from.id}`, "");
      return send(env, chatId, t(lang, "install_text"), { reply_markup: installKeyboard(lang, true) });
    case "/update":
      await setConfig(env, `await_utoken_${from.id}`, "1");
      await setConfig(env, `await_token_${from.id}`, "");
      return send(env, chatId, t(lang, "upd_text"), { reply_markup: updateKeyboard(lang) });
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

// Layout mirrors the reference design: green build button, blue manage button,
// paired half-width utility rows, red Support us as the closing row.
async function menuMarkup(env, lang) {
  const rows = [
    [{ text: t(lang, "btn_install"), callback_data: "install", style: "success" }],
    [{ text: t(lang, "btn_update"), callback_data: "update", style: "primary" }],
  ];
  for (const s of await listSections(env)) rows.push([{ text: s.title, callback_data: `sec:${s.id}` }]);
  const appsBtn = { text: t(lang, "btn_apps"), callback_data: "apps" };
  const faqOn = (await getConfig(env, "faq_enabled", "1")) === "1" && (await listFaq(env)).length > 0;
  rows.push(faqOn ? [appsBtn, { text: t(lang, "btn_faq"), callback_data: "faq" }] : [appsBtn]);
  const ghBtn = { text: t(lang, "btn_github"), url: "https://github.com/IRNova/Nova-Proxy" };
  if ((await getConfig(env, "contact_enabled", "1")) === "1") {
    rows.push([{ text: t(lang, "btn_contact"), callback_data: "contact" }, ghBtn]);
  } else {
    rows.push([ghBtn]);
  }
  rows.push([{ text: t(lang, "btn_lang"), callback_data: "lang" }]);
  rows.push([{ text: t(lang, "btn_support"), callback_data: "support", style: "danger" }]);
  return { inline_keyboard: rows };
}

// ── Channel membership gate ─────────────────────────────────────────────────
// Users must be in the configured channel to use the bot. The bot has to be an
// admin of that channel for getChatMember to work; if the check itself errors
// (bot not admin, bad channel name) we fail OPEN so a config mistake can't
// lock every user out. Confirmed memberships are cached for 15 minutes.

const MEMBER_CACHE_MS = 15 * 60 * 1000;

function channelSlug(raw) {
  return (raw || "").trim().replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
}

async function requireMember(env, userId) {
  if ((await getConfig(env, "join_required", "1")) !== "1") return { ok: true };
  const chan = channelSlug(await getConfig(env, "join_channel", "irnova_proxy"));
  if (!chan) return { ok: true };
  const cached = await getConfig(env, `member_${userId}`, "");
  if (cached && Date.now() - Number(cached) < MEMBER_CACHE_MS) return { ok: true, chan };
  const r = await tg(env, "getChatMember", { chat_id: "@" + chan, user_id: userId }).catch(() => null);
  if (!r || r.ok !== true) return { ok: true, chan };
  const st = r.result && r.result.status;
  const member = st === "creator" || st === "administrator" || st === "member" ||
    (st === "restricted" && r.result.is_member !== false);
  if (member) await setConfig(env, `member_${userId}`, String(Date.now()));
  return { ok: member, chan };
}

function joinKeyboard(lang, chan) {
  return { inline_keyboard: [
    [{ text: t(lang, "btn_join"), url: `https://t.me/${chan}`, style: "primary" }],
    [{ text: t(lang, "btn_joined"), callback_data: "joined", style: "success" }],
  ] };
}

async function menuText(env, from, lang) {
  const welcome = (await getConfig(env, "welcome_" + lang, "")).trim() ||
    (await getConfig(env, "welcome", "")).trim();
  const hi = from && from.first_name ? esc(from.first_name) : (lang === "fa" ? "دوست عزیز" : "there");
  return welcome || `${t(lang, "menu_title")}\n\n${t(lang, "menu_hi", hi)}\n${t(lang, "menu_body")}`;
}

async function sendMenu(env, chatId, from, lang) {
  const text = await menuText(env, from, lang);
  const markup = await menuMarkup(env, lang);
  const img = (await getConfig(env, "welcome_image",
    "https://nova-install-bot.bitter-flower-1b15.workers.dev/banner.jpg")).trim();
  if (img) {
    const r = await sendPhoto(env, chatId, img, text, { reply_markup: markup });
    if (r && r.ok) return r;
    // Bad / unreachable image URL: fall back to text so the menu still shows.
  }
  return send(env, chatId, text, { reply_markup: markup });
}

async function replaceWithMenu(env, chatId, msgId, from, lang) {
  return showView(env, chatId, msgId, await menuText(env, from, lang), { reply_markup: await menuMarkup(env, lang) });
}

// Update a menu view in place. When the menu was sent with a banner photo, the
// content lives in the caption, so we edit the caption; a plain-text menu is
// edited as text. We try caption first (banner is on by default) and fall back
// to a text edit, then to replacing the message if the content is too long for
// a caption (Telegram caps captions at 1024 chars).
async function showView(env, chatId, msgId, text, extra = {}) {
  let r = await editCaption(env, chatId, msgId, text, extra);
  if (r && r.ok) return r;
  r = await edit(env, chatId, msgId, text, extra);
  if (r && r.ok) return r;
  await deleteMessage(env, chatId, msgId);
  return send(env, chatId, text, extra);
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

  // Reply button on a forwarded message / whois card: pop a reply box for the
  // admin who tapped, mapped back to the same user so their next message relays.
  if (data.startsWith("reply:")) {
    const group = await getConfig(env, "contact_group_id", "");
    if (!group || String(chatId) !== String(group)) return answerCb(env, cb.id);
    await answerCb(env, cb.id);
    const targetId = Number(data.split(":")[1]);
    const u = await env.DB.prepare("SELECT first_name, username FROM users WHERE id = ?")
      .bind(targetId).first();
    const name = u ? (u.username ? "@" + u.username : (u.first_name || "user")) : "user";
    // Mention the tapping admin so the ForceReply pops only for them (selective).
    const a = cb.from || {};
    const mention = a.username
      ? "@" + esc(a.username)
      : `<a href="tg://user?id=${a.id}">${esc(a.first_name || "admin")}</a>`;
    const prompt =
      `${mention}\n` +
      `✍️ <b>Reply to ${esc(name)}</b> / پاسخ به ${esc(name)}\n` +
      `Type your message below / پیام خود را بنویسید`;
    const sent = await send(env, group, prompt, {
      reply_markup: { force_reply: true, selective: true, input_field_placeholder: "Your reply / پاسخ شما" },
    }).catch(() => null);
    if (sent && sent.ok && sent.result) {
      // card_msg_id points back at the card the button sits on, so answering
      // the ForceReply prompt can flip that card's Reply button to "Replied".
      await env.DB.prepare(
        "INSERT OR REPLACE INTO contact_map (group_msg_id, user_id, card_msg_id) VALUES (?, ?, ?)"
      ).bind(sent.result.message_id, targetId, msgId).run();
    }
    return;
  }

  // Ban / unban from the admin group (the Block button on a forwarded message).
  if (data.startsWith("ban:") || data.startsWith("unban:")) {
    const group = await getConfig(env, "contact_group_id", "");
    if (!group || String(chatId) !== String(group)) return answerCb(env, cb.id);
    const ban = data.startsWith("ban:");
    const targetId = Number(data.split(":")[1]);
    await setBanned(env, targetId, ban);
    await answerCb(env, cb.id, ban ? "User blocked" : "User unblocked");
    // Keep the green "Replied" state when redrawing the buttons.
    const mrow = await env.DB.prepare(
      "SELECT replied FROM contact_map WHERE group_msg_id = ?"
    ).bind(msgId).first().catch(() => null);
    await tg(env, "editMessageReplyMarkup", {
      chat_id: chatId, message_id: msgId,
      reply_markup: contactKb(targetId, ban, !!(mrow && mrow.replied)),
    }).catch(() => {});
    return;
  }

  await touchUser(env, cb.from, normLang(cb.from && cb.from.language_code)).catch(() => {});
  const lang = (await getUserLang(env, cb.from.id)) || normLang(cb.from && cb.from.language_code);

  // "I've joined" re-checks membership; everything else is behind the gate.
  if (data === "joined") {
    const gate = await requireMember(env, cb.from.id);
    if (!gate.ok) return answerCb(env, cb.id, t(lang, "join_no"), true);
    await answerCb(env, cb.id, t(lang, "join_ok"));
    return replaceWithMenu(env, chatId, msgId, cb.from, lang);
  }
  const gate = await requireMember(env, cb.from.id);
  if (!gate.ok) {
    await answerCb(env, cb.id);
    return showView(env, chatId, msgId, t(lang, "join_text"), { reply_markup: joinKeyboard(lang, gate.chan) });
  }

  await answerCb(env, cb.id);

  // AI answer feedback: "Solved" closes the loop; "Talk to support" escalates
  // the original question (plus the AI's answer) to the admin group.
  if (data.startsWith("aiok:")) {
    await markQaResolved(env, +data.slice(5)).catch(() => {});
    await tg(env, "editMessageReplyMarkup", {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [backRow(lang)] },
    }).catch(() => {});
    return;
  }
  if (data.startsWith("aiesc:")) {
    const qa = await getQa(env, +data.slice(6)).catch(() => null);
    await tg(env, "editMessageReplyMarkup", {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [backRow(lang)] },
    }).catch(() => {});
    if (!qa) return startContact(env, chatId, cb.from.id, lang);
    const note = `⚠️ <b>Escalated</b>: the assistant answered but the user asked for a human.` +
      (qa.answer ? `\n\n🤖 <i>AI answer was:</i> ${esc(qa.answer)}` : "");
    return forwardContact(env, cb.from, chatId, { text: qa.question }, lang, { qaId: qa.id, note });
  }

  if (data === "menu") return replaceWithMenu(env, chatId, msgId, cb.from, lang);
  if (data === "lang") return toggleLang(env, chatId, cb.from.id, lang, msgId);
  if (data === "install") {
    await setConfig(env, `await_token_${cb.from.id}`, "1");
    await setConfig(env, `await_utoken_${cb.from.id}`, "");
    return showView(env, chatId, msgId, t(lang, "install_text"), { reply_markup: installKeyboard(lang, true) });
  }
  if (data === "update") {
    await setConfig(env, `await_utoken_${cb.from.id}`, "1");
    await setConfig(env, `await_token_${cb.from.id}`, "");
    return showView(env, chatId, msgId, t(lang, "upd_text"), { reply_markup: updateKeyboard(lang) });
  }
  if (data === "updx") {
    await clearUpdCtx(env, cb.from.id);
    await setConfig(env, `await_utoken_${cb.from.id}`, "");
    return replaceWithMenu(env, chatId, msgId, cb.from, lang);
  }
  if (data.startsWith("updp:")) {
    const i = +data.slice(5);
    const ctx = await loadUpdCtx(env, cb.from.id);
    if (!ctx || !ctx.w[i]) {
      return edit(env, chatId, msgId, t(lang, "upd_expired"),
        { reply_markup: { inline_keyboard: [backRow(lang)] } });
    }
    return edit(env, chatId, msgId, t(lang, "upd_confirm", ctx.w[i]), {
      reply_markup: { inline_keyboard: [
        [{ text: t(lang, "btn_upd_go"), callback_data: `updg:${i}`, style: "success" }],
        [{ text: t(lang, "btn_upd_cancel"), callback_data: "updx" }],
      ] },
    });
  }
  if (data.startsWith("updg:")) return runUpdate(env, chatId, msgId, cb.from.id, +data.slice(5), lang);
  if (data === "support") return editSupport(env, chatId, msgId, lang);
  if (data === "apps")
    return showView(env, chatId, msgId, t(lang, "apps_title"), { reply_markup: appsKeyboard(lang) });
  if (data === "faq") return editFaqList(env, chatId, msgId, lang);
  if (data === "contact") { await startContact(env, chatId, cb.from.id, lang); return; }
  if (data.startsWith("faq:")) return editFaqAnswer(env, chatId, msgId, +data.slice(4), lang);
  if (data.startsWith("sec:")) return editSection(env, chatId, msgId, +data.slice(4), lang);
}

// ── Install intro ───────────────────────────────────────────────────────────

function installKeyboard(lang, withBack) {
  const rows = [
    [{ text: t(lang, "btn_get_token"), url: TOKEN_DEEPLINK, style: "primary" }],
    [{ text: t(lang, "btn_make_account"), url: "https://dash.cloudflare.com/sign-up" }],
  ];
  if (withBack) rows.push(backRow(lang));
  return { inline_keyboard: rows };
}

// ── Update panel intro ──────────────────────────────────────────────────────

function updateKeyboard(lang) {
  return { inline_keyboard: [
    [{ text: t(lang, "btn_get_token"), url: TOKEN_DEEPLINK, style: "primary" }],
    backRow(lang),
  ] };
}

// ── Support us ──────────────────────────────────────────────────────────────
// Message text and link buttons come from the admin panel (Settings). With
// neither defined, the button still shows but explains support isn't set up.

async function editSupport(env, chatId, msgId, lang) {
  const body = (await getConfig(env, "support_text", "")).trim();
  const rows = [];
  for (const line of (await getConfig(env, "support_links", "")).split(/\r?\n/)) {
    const i = line.indexOf("|");
    if (i < 0) continue;
    const label = line.slice(0, i).trim();
    const url = line.slice(i + 1).trim();
    if (label && /^(https?|tg):\/\//i.test(url)) rows.push([{ text: label, url, style: "success" }]);
  }
  if (!body && !rows.length) {
    return showView(env, chatId, msgId, t(lang, "support_notset"),
      { reply_markup: { inline_keyboard: [backRow(lang)] } });
  }
  rows.push(backRow(lang));
  return showView(env, chatId, msgId, t(lang, "support_title") + (body ? "\n\n" + body : ""),
    { reply_markup: { inline_keyboard: rows } });
}

// ── Apps ────────────────────────────────────────────────────────────────────

function appsKeyboard(lang) {
  return {
    inline_keyboard: [
      [{ text: t(lang, "btn_android"), url: "https://github.com/IRNova/Nova-Client/releases/latest/download/nova-client.apk", style: "success" }],
      [{ text: t(lang, "btn_all_dl"), url: "https://github.com/IRNova/Nova-Client/releases", style: "primary" }],
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
  return showView(env, chatId, msgId, text, { reply_markup: markup });
}
async function editFaqAnswer(env, chatId, msgId, id, lang) {
  const f = await getFaq(env, id);
  if (!f) return editFaqList(env, chatId, msgId, lang);
  const text = `❓ <b>${esc(f.question)}</b>\n\n${f.answer}`;
  return showView(env, chatId, msgId, text, {
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
  return showView(env, chatId, msgId, `<b>${esc(s.title)}</b>\n\n${s.body}`, {
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

// Admin-group action buttons shown under every forwarded message / whois card.
// Labels are bilingual (EN / FA) since the group has no single language. Once
// an admin has answered, the Reply button turns green and reads "Replied".
function contactKb(userId, banned, replied) {
  return { inline_keyboard: [[
    replied
      ? { text: "✅ Replied / پاسخ داده شد", callback_data: `reply:${userId}`, style: "success" }
      : { text: "✍️ Reply / پاسخ", callback_data: `reply:${userId}`, style: "primary" },
    banned
      ? { text: "✅ Unblock / رفع مسدودی", callback_data: `unban:${userId}` }
      : { text: "🚫 Block / مسدود", callback_data: `ban:${userId}`, style: "danger" },
  ]] };
}

// Every support message is logged to qa_log. The AI assistant answers when it
// is confident; anything else (AI off, no key, API error, low confidence) goes
// to the admin group exactly as before.
async function handleContactMessage(env, from, chatId, msg, lang) {
  const question = (msg.text || "").trim();
  const qaId = question ? await logQuestion(env, from.id, lang, question).catch(() => null) : null;

  if (question && (await aiEnabled(env))) {
    await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
    const r = await autoAnswer(env, question, lang).catch(() => null);
    if (r && r.confident && r.answer) {
      await setQaAnswer(env, qaId, r.answer, "ai").catch(() => {});
      const kb = { inline_keyboard: [
        [
          { text: t(lang, "btn_ai_solved"), callback_data: `aiok:${qaId}`, style: "success" },
          { text: t(lang, "btn_ai_human"), callback_data: `aiesc:${qaId}`, style: "primary" },
        ],
        backRow(lang),
      ] };
      const body = `${r.answer}\n\n<i>${t(lang, "ai_note")}</i>`;
      let sr = await send(env, chatId, body, { reply_markup: kb });
      // The model's HTML can occasionally be malformed; resend escaped.
      if (!sr || sr.ok === false) sr = await send(env, chatId, esc(r.answer), { reply_markup: kb });
      if (sr && sr.ok !== false) {
        await sendAiAudit(env, from, question, r.answer, qaId).catch(() => {});
        return;
      }
    }
  }
  return forwardContact(env, from, chatId, msg, lang, { qaId });
}

// Copy of an auto-answered exchange for the admin group, with the usual
// Reply/Block buttons so an admin can correct the assistant. A group reply to
// this card overwrites the AI answer in qa_log with the human one.
async function sendAiAudit(env, from, question, answer, qaId) {
  const group = await getConfig(env, "contact_group_id", "");
  if (!group) return;
  const card = await gatherUserCard(env, from.id, from);
  const text =
    `🤖 <b>Auto-answered</b>\n\n` +
    `❓ “${esc(question)}”\n\n` +
    `💬 ${esc(answer)}\n\n` +
    card.text +
    `\n\n<i>Reply to this message to send a correction to the user.</i>`;
  const sent = await send(env, group, text, { reply_markup: contactKb(from.id, false) });
  if (sent && sent.result && sent.result.message_id) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO contact_map (group_msg_id, user_id, card_msg_id, qa_id) VALUES (?, ?, ?, ?)"
    ).bind(sent.result.message_id, from.id, sent.result.message_id, qaId).run();
  }
}

async function forwardContact(env, from, chatId, msg, lang, { qaId = null, note = "" } = {}) {
  const group = await getConfig(env, "contact_group_id", "");
  if (!group) return send(env, chatId, t(lang, "contact_notset"));

  const card = await gatherUserCard(env, from.id, from);
  const header =
    (note ? note + "\n\n" : "") +
    `✉️ <b>New message</b>\n\n` +
    `“${esc(msg.text || "")}”\n\n` +
    card.text +
    `\n\n<i>Tap Reply below, or reply to this message, to answer them.</i>`;
  const kb = contactKb(from.id, false);

  // The message admins reply to (mapped back to the user).
  const sent = await send(env, group, header, { reply_markup: kb });
  if (sent && sent.result && sent.result.message_id) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO contact_map (group_msg_id, user_id, card_msg_id, qa_id) VALUES (?, ?, ?, ?)"
    ).bind(sent.result.message_id, from.id, sent.result.message_id, qaId).run();
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
  const card = await gatherUserCard(env, targetId, null, { full: true });
  const banned = await isBanned(env, targetId);
  await send(env, group, card.text, { reply_markup: contactKb(targetId, banned) });
}

async function handleGroupReply(msg, env) {
  const reply = msg.reply_to_message;
  if (!reply || !msg.text) return;
  const row = await env.DB.prepare(
    "SELECT user_id, card_msg_id FROM contact_map WHERE group_msg_id = ?"
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
    // Delivered: flip the card's Reply button to a green "Replied" so the
    // admins can see at a glance which messages are already handled.
    const cardId = row.card_msg_id || reply.message_id;
    await env.DB.prepare(
      "UPDATE contact_map SET replied = 1 WHERE group_msg_id IN (?, ?)"
    ).bind(reply.message_id, cardId).run().catch(() => {});
    // Record the delivered reply as the human answer to the question this
    // card carries, so the AI learns from it and the FAQ suggester sees it.
    await setQaAnswerByCard(env, cardId, msg.text).catch(() => {});
    const banned = await isBanned(env, userId);
    await tg(env, "editMessageReplyMarkup", {
      chat_id: msg.chat.id, message_id: cardId,
      reply_markup: contactKb(userId, banned, true),
    }).catch(() => {});
  }
}
