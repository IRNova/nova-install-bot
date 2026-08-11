// Update router: commands, main menu, FAQ, dynamic sections, contact flow.
// Every user-facing string goes through i18n (English + Persian).

import { tg, send, edit, sendPhoto, editCaption, answerCb, deleteMessage, esc, bidi, escBidi } from "./telegram.js";
import {
  touchUser, getConfig, setConfig, listFaq, getFaq, listSections, getSection,
  markBlocked, getUserLang, setUserLang, isBanned, setBanned,
  logQuestion, setQaAnswer, setQaAnswerByCard, setQaDraft, markQaResolved, getQa,
  bumpOffense, setOffenderStatus, setQaSource, listSuggestions, countSuggestions,
} from "./db.js";
import { getPanelAdminIds } from "./admin_2fa.js";
import { aiEnabled, autoAnswer } from "./ai.js";
import { install, TOKEN_DEEPLINK, UPDATE_TOKEN_DEEPLINK, extractToken } from "./install.js";
import { startUpdate, runUpdate, loadUpdCtx, clearUpdCtx } from "./update.js";
import { t, normLang } from "./i18n.js";
import { gatherUserCard } from "./userinfo.js";

// The bot's profile description (the text shown above "Start bot"). The Latin
// brand word is wrapped in directional isolates (U+2066 LEFT-TO-RIGHT ISOLATE
// ... U+2069 POP DIRECTIONAL ISOLATE) and each line is prefixed with an RLM
// (U+200F RIGHT-TO-LEFT MARK) so the RTL sentence and its punctuation render
// correctly around it. These are inserted from \u escapes so the source stays
// clean. Bump PROFILE_SYNC_VER to re-apply on the next sync.
const PROFILE_SYNC_VER = "2026-07-fa-bidi";
const NOVA_DESC_FA =
  "\u200Fنوا پروکسی یک پروژه رایگان و متن‌باز توسط تیم \u2066IRNova\u2069 است.\n" +
  "\u200Fهدف ما: ارائه اینترنت آزاد و بدون سانسور و رایگان برای همه.";

// Set the bot's description via the Bot API. Idempotent: it only calls Telegram
// when the stored version differs (or force is set), so it is cheap to trigger.
// Applied to both the default and the Farsi locale so every viewer gets the
// corrected text.
export async function syncBotProfile(env, { force = false } = {}) {
  if (!env.BOT_TOKEN) return { ok: false, reason: "no BOT_TOKEN" };
  if (!force && (await getConfig(env, "profile_sync", "")) === PROFILE_SYNC_VER) {
    return { ok: true, skipped: true, version: PROFILE_SYNC_VER };
  }
  const results = {};
  for (const language_code of ["", "fa"]) {
    const r = await tg(env, "setMyDescription", {
      description: NOVA_DESC_FA,
      ...(language_code ? { language_code } : {}),
    }).catch((e) => ({ ok: false, description: e && e.message }));
    results[language_code || "default"] = r && r.ok === true ? "ok" : (r && r.description) || "failed";
  }
  await setConfig(env, "profile_sync", PROFILE_SYNC_VER);
  return { ok: true, version: PROFILE_SYNC_VER, results };
}

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

  const communityGroup = await getConfig(env, "community_group_id", "");
  if (communityGroup && String(msg.chat.id) === String(communityGroup)) {
    return handleCommunityMessage(msg, env);
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
  // A user in the contact flow may send a photo or video (no text) as their
  // question; let those through so handleContactMessage can relay them.
  // Everything else below still needs text.
  if (!text && !contactMedia(msg)) return;

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
    case "/start": {
      const startPayload = (text.split(/\s+/)[1] || "").toLowerCase();
      if (startPayload === "update") {
        await setConfig(env, `await_utoken_${from.id}`, "1");
        await setConfig(env, `await_token_${from.id}`, "");
        return send(env, chatId, t(lang, "upd_text"), { reply_markup: updateKeyboard(lang) });
      }
      if (startPayload === "install" || startPayload === "setup") {
        await setConfig(env, `await_token_${from.id}`, "1");
        await setConfig(env, `await_utoken_${from.id}`, "");
        return send(env, chatId, t(lang, "install_text"), { reply_markup: installKeyboard(lang, true) });
      }
      return sendMenu(env, chatId, from, lang);
    }
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
    /* Read the custom_emoji_id out of a message, so branded button icons can be
     * wired up without guessing.
     *
     * `icon_custom_emoji_id` on InlineKeyboardButton needs the emoji's id, and
     * the only way to learn one is to receive a message containing it and read
     * the `custom_emoji` entity. Admin-only because it is a developer tool, not
     * a feature: it does nothing for a normal user and would only confuse them.
     *
     * Usage: reply /emojiid to a message containing the emoji, or send
     * /emojiid followed by them on the same line. */
    case "/emojiid": {
      const admins = await getPanelAdminIds(env);
      if (admins.length && !admins.includes(String(from.id))) return;
      /* `/emojiid <packname>` reads the WHOLE set from the Bot API instead of
       * from a message. Collecting ids by pasting emoji into a chat means
       * finding the pack in the client's picker, which is fiddly and silently
       * gives you a standard emoji when it goes wrong. `getStickerSet` returns
       * every sticker with its `custom_emoji_id` and its assigned emoji, in
       * pack order, which is exactly the mapping needed and cannot be got wrong.
       */
      const packArg = (text.split(/\s+/)[1] || "").trim().replace(/^.*addemoji\//, "");
      if (packArg && !/^[\p{Emoji}️‍]/u.test(packArg)) {
        const r = await tg(env, "getStickerSet", { name: packArg });
        if (!r || r.ok !== true) {
          return send(env, chatId, `No set named <code>${esc(packArg)}</code>. ${esc((r && r.description) || "")}`);
        }
        const list = (r.result.stickers || []).map((s, i) =>
          `${i + 1}. ${s.emoji || "?"}  <code>${esc(s.custom_emoji_id || "(not a custom emoji)")}</code>`);
        return send(env, chatId,
          `<b>${esc(r.result.title)}</b> (<code>${esc(r.result.name)}</code>)\n` +
          `${list.length} emoji, in pack order:\n\n${list.join("\n")}`);
      }
      const src = msg.reply_to_message || msg;
      const ents = [...(src.entities || []), ...(src.caption_entities || [])]
        .filter((e) => e.type === "custom_emoji" && e.custom_emoji_id);
      if (!ents.length) {
        return send(env, chatId,
          "Send <code>/emojiid</code> followed by one or more custom emoji, or reply <code>/emojiid</code> to a message that has them.\n\n" +
          "Custom emoji only: the standard ones have no id.");
      }
      /* NOT `text`: that is the outer message text, and re-declaring it here
       * put the whole case block in a temporal dead zone, so the pack-name
       * branch above threw `Cannot access 'text' before initialization` and the
       * command answered nothing at all. */
      const body = String(src.text || src.caption || "");
      const lines = ents.map((e) => {
        // Entity offsets are in UTF-16 code units, which is what JS strings use.
        const glyph = body.slice(e.offset, e.offset + e.length) || "?";
        return `${glyph}  <code>${esc(e.custom_emoji_id)}</code>`;
      });
      return send(env, chatId, `Custom emoji ids:\n\n${lines.join("\n")}`);
    }
    case "/contact":
      return startContact(env, chatId, from.id, lang);
    case "/deploy":
      return sendDeploy(env, chatId, lang);
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
    [{ text: t(lang, "btn_install"), callback_data: "install", style: "success", icon_custom_emoji_id: ICON.build }],
    [{ text: t(lang, "btn_update"), callback_data: "update", style: "primary", icon_custom_emoji_id: ICON.manage }],
    [{ text: t(lang, "btn_deploy"), callback_data: "deploy", icon_custom_emoji_id: ICON.nova }],
    /* Nova Server, at the top level rather than only three taps down inside the
     * deploy hub. It is a whole product and the people who want it arrive
     * already knowing they do, so making them browse for it costs installs. It
     * stays in the hub as well, for the people who are still deciding. */
    /* `primary`, because a product entry point should not be indistinguishable
     * from "FAQ". Telegram gives exactly three button colours, so they only work
     * by scarcity: three coloured rows out of eleven reads as a hierarchy, eight
     * would read as noise. */
    [{ text: t(lang, "btn_vps"), callback_data: "dep_vps", style: "primary", icon_custom_emoji_id: ICON.server }],
  ];
  for (const s of await listSections(env)) rows.push([{ text: s.title, callback_data: `sec:${s.id}` }]);
  const appsBtn = { text: t(lang, "btn_apps"), callback_data: "apps" };
  const faqOn = (await getConfig(env, "faq_enabled", "1")) === "1" && (await listFaq(env)).length > 0;
  rows.push(faqOn ? [appsBtn, { text: t(lang, "btn_faq"), callback_data: "faq", icon_custom_emoji_id: ICON.help }] : [appsBtn]);
  const ghBtn = { text: t(lang, "btn_github"), url: "https://github.com/IRNova/Nova-Proxy" };
  if ((await getConfig(env, "contact_enabled", "1")) === "1") {
    rows.push([{ text: t(lang, "btn_contact"), callback_data: "contact" }, ghBtn]);
  } else {
    rows.push([ghBtn]);
  }
  // Where to follow us. The bot is the surface with the most users by a wide
  // margin and was the only one carrying none of these.
  rows.push([{ text: t(lang, "btn_socials"), callback_data: "socials", icon_custom_emoji_id: ICON.follow }]);
  rows.push([{ text: t(lang, "btn_lang"), callback_data: "lang" }]);
  /* NOT `danger`. Red is Telegram's destructive style, and this bot uses that
   * same red for "Block / مسدود" in the admin flow. A donate button wearing the
   * ban colour is both alarming and a waste of the one style that should mean
   * "this cannot be undone". It keeps its prominence from being the last row and
   * from the heart. */
  rows.push([{ text: t(lang, "btn_support"), callback_data: "support", icon_custom_emoji_id: ICON.heart }]);
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
  const defaultImage = env.PUBLIC_URL
    ? String(env.PUBLIC_URL).replace(/\/+$/, "") + "/banner.jpg"
    : "";
  const img = (await getConfig(env, "welcome_image", defaultImage)).trim() || defaultImage;
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

/* Where to follow Nova. One screen rather than links scattered through the
 * copy, and the URLs are the same five the website publishes, so a channel that
 * moves is changed in one place per surface rather than found later by a user.
 *
 * The GitHub link is Nova-PROXY specifically, not a generic "our GitHub". Nova
 * Server is closed by design, and pointing at the org invites people to go
 * looking for source that is deliberately not there. */
/* Nova's own emoji, shown before the button text via `icon_custom_emoji_id`.
 *
 * Telegram allows exactly three button colours (danger, success, primary), so
 * this is the only way to put the BRAND on a keyboard. The ids come from
 * t.me/addemoji/NovaProxy and are stable for the life of that pack; read them
 * again with `/emojiid NovaProxy` if the pack is ever rebuilt.
 *
 * Rendered only while the bot owner holds Telegram Premium, or if the bot has
 * Fragment usernames. When neither holds, Telegram ignores the field and the
 * button falls back to its text alone.
 *
 * **The seven labels that get an icon carry NO emoji of their own.** They used
 * to, as a fallback, and with the icons live that showed two emoji on every
 * button. A permanent visual defect for every user was not worth insuring
 * against a lapsed subscription, so the labels are clean and the fallback is
 * plain text. Any label WITHOUT an icon below keeps its emoji.
 *
 * So: adding `icon_custom_emoji_id` to a button means removing the emoji from
 * its label in BOTH languages, and removing the icon means putting it back.
 */
const ICON = {
  shield: "5177354342549686013",
  server: "5177167867954596435",
  nova:   "5174670245687723771",
  manage: "5177049906677811482",
  help:   "5176992096418006835",
  heart:  "5177098487052895967",
  follow: "5174750802094327829",
  build:  "5177351022539966619",
};

const SOCIALS = [
  { key: "soc_tg", url: "https://t.me/irnova_proxy" },
  { key: "soc_ig", url: "https://instagram.com/irnova_proxy" },
  { key: "soc_x", url: "https://x.com/irNovaProxy" },
  { key: "soc_yt", url: "https://youtube.com/@novaproxyir" },
  { key: "soc_gh", url: "https://github.com/IRNova/Nova-Proxy" },
];

function socialsMarkup(lang) {
  // Two per row for the four social apps, then GitHub on its own: five in a
  // single column is a lot of scrolling on a phone.
  const b = (s) => ({ text: t(lang, s.key), url: s.url });
  return { inline_keyboard: [
    [b(SOCIALS[0]), b(SOCIALS[1])],
    [b(SOCIALS[2]), b(SOCIALS[3])],
    [b(SOCIALS[4])],
    backRow(lang),
  ] };
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

  /* Card actions belong to the admin group and nowhere else.
   *
   * `callback_data` is whatever the client sends: a user does not have to be
   * shown a button to press it, and over raw MTProto the payload is arbitrary
   * bytes. So the button a card carries proves nothing, and the only thing worth
   * trusting is which chat the message lives in.
   *
   * This is a single gate at the top rather than a copy inside each branch,
   * because the per-branch version is exactly the check that gets forgotten when
   * a new card action is added. It was: qclose, qsugg and qtag shipped without
   * it, which let any of the 26k users close every open support question in a
   * loop, and read other users' ids out of the keyboard the bot built back. */
  // Declared outside the block because the branches below still use it: `const`
  // inside the `if` would scope it to the gate and leave `reply:` referencing
  // a name that no longer exists.
  let group = "";
  if (/^(reply|dok|qclose|qsugg|qtag|ban|unban):/.test(data)) {
    group = await getConfig(env, "contact_group_id", "");
    if (!group || String(chatId) !== String(group)) return answerCb(env, cb.id);
  }

  // Reply button on a forwarded message / whois card: pop a reply box for the
  // admin who tapped, mapped back to the same user so their next message relays.
  if (data.startsWith("reply:")) {
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
      `✍️ <b>Reply to ${escBidi(name)}</b> / پاسخ به ${escBidi(name)}\n` +
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

  // Send the AI-drafted reply (the "Send AI draft" button on a group card).
  // The draft was written by the AI but a human is approving it here, so it is
  // recorded as source 'approved' and feeds the knowledge pack as gold data.
  if (data.startsWith("dok:")) {
    const group = await getConfig(env, "contact_group_id", "");
    if (!group || String(chatId) !== String(group)) return answerCb(env, cb.id);
    const qa = await getQa(env, Number(data.slice(4))).catch(() => null);
    if (!qa || !qa.draft) return answerCb(env, cb.id, "No draft found", true);
    if (qa.answer) return answerCb(env, cb.id, "Already answered / قبلا پاسخ داده شده");
    const uLang = (await getUserLang(env, qa.user_id)) || qa.lang || "en";
    let r = await send(env, qa.user_id, `${t(uLang, "reply_prefix")}\n\n${qa.draft}`);
    if (!r || r.ok === false) r = await send(env, qa.user_id, `${t(uLang, "reply_prefix")}\n\n${esc(qa.draft)}`);
    if (!r || r.ok === false) {
      if (r && r.error_code === 403) await markBlocked(env, qa.user_id).catch(() => {});
      return answerCb(env, cb.id, "Could not deliver / ارسال نشد", true);
    }
    await setQaAnswer(env, qa.id, qa.draft, "approved");
    await env.DB.prepare("UPDATE contact_map SET replied = 1 WHERE group_msg_id = ?")
      .bind(msgId).run().catch(() => {});
    const banned = await isBanned(env, qa.user_id).catch(() => false);
    await tg(env, "editMessageReplyMarkup", {
      chat_id: chatId, message_id: msgId,
      reply_markup: await cardKbFor(env, msgId, qa.user_id, banned, true),
    }).catch(() => {});
    return answerCb(env, cb.id, "Draft sent ✅");
  }

  // Ban / unban from the admin group (the Block button on a forwarded message).
  /* Close, Suggestion, and the tag correction. All three edit the card in place
   * so the group can see what was done and by whom, rather than the card looking
   * untouched while a row quietly changed in the database. */
  if (data.startsWith("qclose:") || data.startsWith("qsugg:")) {
    const closing = data.startsWith("qclose:");
    const rawId = data.slice(closing ? 7 : 6);
    // Digits only. `Number.isInteger` would wave through "99999999999999999999"
    // as 1e20, and anything past 1e21 stringifies back as "1e+21".
    if (!/^\d{1,15}$/.test(rawId)) return answerCb(env, cb.id);
    const qaId = Number(rawId);
    await setQaSource(env, qaId, closing ? "closed" : "suggestion").catch(() => {});
    const who = cb.from.first_name || "admin";
    // bidi, not escBidi: appendToCard sends text with `entities` and no
    // parse_mode, so this line is plain text and escaping would print the
    // entities themselves ("&amp;") to the group.
    const note = closing
      ? `\n\n🗑 Closed by ${bidi(who)} / بسته شد`
      : `\n\n💡 Saved as an idea by ${bidi(who)} / به‌عنوان پیشنهاد ثبت شد`;
    /* Closing is terminal, so the buttons go. An idea is not: the user asked for
     * something and is still owed a "noted, thanks", so a 💡 card keeps Reply. */
    let kb = { inline_keyboard: [] };
    if (!closing) {
      const row = await env.DB.prepare("SELECT user_id, replied FROM contact_map WHERE group_msg_id = ?")
        .bind(msgId).first().catch(() => null);
      const uid = row && row.user_id;
      const banned = uid ? await isBanned(env, uid).catch(() => false) : false;
      kb = await cardKbFor(env, msgId, uid, banned, !!(row && row.replied));
    }
    await appendToCard(env, chatId, msgId, cb.message, note, kb);
    return answerCb(env, cb.id, closing ? "Closed 🗑" : "Saved as an idea 💡");
  }
  if (data.startsWith("qtag:")) {
    const [, rawId, want] = data.split(":");
    // The id becomes part of a config key, so it has to be a number before it is
    // interpolated, not after. Otherwise every press writes a new arbitrary row.
    if (!/^\d{1,15}$/.test(rawId)) return answerCb(env, cb.id);
    const id = Number(rawId);
    const product = PRODUCTS[want] ? want : "proxy";
    await setConfig(env, `qprod_${id}`, product);
    /* Teach the inference from the correction: the next question from this user
     * starts on the product an admin said they were actually asking about. A
     * correction that only fixes one card is a correction you make again
     * tomorrow. */
    const qa = await getQa(env, +id).catch(() => null);
    if (qa && qa.user_id) await setConfig(env, `flow_${qa.user_id}`, product);
    const banned = qa && qa.user_id ? await isBanned(env, qa.user_id).catch(() => false) : false;
    const mrow = await env.DB.prepare("SELECT replied FROM contact_map WHERE group_msg_id = ?")
      .bind(msgId).first().catch(() => null);
    // The tag lives in the card's first line; swapping the two chips in place is
    // the whole edit, and the rest of the card must survive it untouched.
    await tg(env, "editMessageReplyMarkup", {
      chat_id: chatId, message_id: msgId,
      reply_markup: contactKb(qa && qa.user_id, banned, !!(mrow && mrow.replied), null, +id, product),
    }).catch(() => {});
    await retagCard(env, chatId, msgId, cb.message, product);
    return answerCb(env, cb.id, `${PRODUCTS[product].tag}`);
  }
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
      reply_markup: await cardKbFor(env, msgId, targetId, ban, !!(mrow && mrow.replied)),
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
  /* Remember which product they are here for. `inferProduct` reads this when
   * their next message reaches support, which is far more reliable than reading
   * the words of a message written by someone who is already stuck. */
  if (data === "install") {
    await setConfig(env, `flow_${cb.from.id}`, "proxy");
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
    const chosen = ctx.w[i];
    const label = chosen.c ? `${chosen.n} · ${chosen.c}` : chosen.n;
    return edit(env, chatId, msgId, t(lang, "upd_confirm", esc(label)), {
      reply_markup: { inline_keyboard: [
        [{ text: t(lang, "btn_upd_go"), callback_data: `updg:${i}`, style: "success" }],
        [{ text: t(lang, "btn_upd_cancel"), callback_data: "updx" }],
      ] },
    });
  }
  if (data.startsWith("updg:")) return runUpdate(env, chatId, msgId, cb.from.id, +data.slice(5), lang);
  if (data === "support") return editSupport(env, chatId, msgId, lang);
  if (data === "socials")
    return showView(env, chatId, msgId, t(lang, "socials_text"), { reply_markup: socialsMarkup(lang) });
  if (data === "deploy")
    return showView(env, chatId, msgId, t(lang, "deploy_title"), { reply_markup: deployMarkup(lang) });
  if (data === "dep_panel") {
    await setConfig(env, `flow_${cb.from.id}`, "proxy");
    // Same as Install: arm the token-paste state so a pasted token builds the panel.
    await setConfig(env, `await_token_${cb.from.id}`, "1");
    await setConfig(env, `await_utoken_${cb.from.id}`, "");
    return showView(env, chatId, msgId, t(lang, "deploy_panel_text"), { reply_markup: depPanelKeyboard(lang) });
  }
  if (data === "dep_vps") await setConfig(env, `flow_${cb.from.id}`, "server");
  if (data === "dep_vps")
    return showView(env, chatId, msgId, t(lang, "deploy_vps_text"), { reply_markup: depVpsKeyboard(lang) });
  if (data === "dep_sub")
    return showView(env, chatId, msgId, t(lang, "deploy_sub_text"), { reply_markup: depSubKeyboard(lang) });
  if (data === "apps")
    return showView(env, chatId, msgId, t(lang, "apps_title"), { reply_markup: appsKeyboard(lang) });
  if (data === "faq") return editFaqList(env, chatId, msgId, lang);
  if (data === "contact") { await startContact(env, chatId, cb.from.id, lang); return; }
  if (data.startsWith("faq:")) return editFaqAnswer(env, chatId, msgId, +data.slice(4), lang);
  if (data.startsWith("sec:")) return editSection(env, chatId, msgId, +data.slice(4), lang);
}

// ── Install intro ───────────────────────────────────────────────────────────

// Cloudflare needs an email address to sign up with. Users who don't have one
// (or who don't want their personal address on a proxy account) get sent to a
// real provider rather than a disposable inbox: a throwaway address means no
// password reset and no way to recover the panel later. Proton is listed first
// because new Tuta free accounts can sit in a manual approval queue.
const EMAIL_PROTON_URL = "https://account.proton.me/signup";
const EMAIL_TUTA_URL = "https://app.tuta.com/signup";

function emailRow(lang) {
  return [
    { text: t(lang, "btn_email_proton"), url: EMAIL_PROTON_URL },
    { text: t(lang, "btn_email_tuta"), url: EMAIL_TUTA_URL },
  ];
}

function installKeyboard(lang, withBack) {
  const rows = [
    [{ text: t(lang, "btn_get_token"), url: TOKEN_DEEPLINK, style: "primary" }],
    [{ text: t(lang, "btn_make_account"), url: "https://dash.cloudflare.com/sign-up" }],
    emailRow(lang),
  ];
  if (withBack) rows.push(backRow(lang));
  return { inline_keyboard: rows };
}

// ── Update panel intro ──────────────────────────────────────────────────────

function updateKeyboard(lang) {
  return { inline_keyboard: [
    [{ text: t(lang, "btn_get_token"), url: UPDATE_TOKEN_DEEPLINK, style: "primary" }],
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

// ── Deploy your own Nova ─────────────────────────────────────────────────────
// A hub mirroring the app's onboarding: build a free Cloudflare panel, connect
// your own VPS, or just use an existing subscription in the app. The panel
// option reuses the tested Install flow; the VPS option installs a standalone
// Nova node (nova-node.sh, its own panel); the subscription option points at
// the app downloads.

function deployMarkup(lang) {
  return { inline_keyboard: [
    [{ text: t(lang, "btn_dep_panel"), callback_data: "dep_panel", style: "success" }],
    [{ text: t(lang, "btn_dep_vps"), callback_data: "dep_vps" }],
    [{ text: t(lang, "btn_dep_sub"), callback_data: "dep_sub" }],
    backRow(lang),
  ] };
}

function depBackRow(lang) {
  return [{ text: t(lang, "btn_back_deploy"), callback_data: "deploy" }];
}

// Panel path: same buttons as Install (get token / make account) but returns to
// the deploy hub instead of the main menu.
function depPanelKeyboard(lang) {
  return { inline_keyboard: [
    [{ text: t(lang, "btn_get_token"), url: TOKEN_DEEPLINK, style: "primary" }],
    [{ text: t(lang, "btn_make_account"), url: "https://dash.cloudflare.com/sign-up" }],
    emailRow(lang),
    depBackRow(lang),
  ] };
}

function depVpsKeyboard(lang) {
  // Nova Server (VPS) install runs in the dedicated installer bot (a Node
  // service that can SSH and detect nodes); this Worker bot just links to it.
  return { inline_keyboard: [
    [{ text: t(lang, "btn_dep_vps_bot"), url: "https://t.me/NovaServerInstaller_Bot", style: "success" }],
    depBackRow(lang),
  ] };
}

function depSubKeyboard(lang) {
  return { inline_keyboard: [
    [{ text: t(lang, "btn_android"), url: "https://github.com/IRNova/Nova-Client/releases/latest/download/nova-client.apk", style: "success" }],
    [{ text: t(lang, "btn_all_dl"), url: "https://github.com/IRNova/Nova-Client/releases", style: "primary" }],
    depBackRow(lang),
  ] };
}

async function sendDeploy(env, chatId, lang) {
  return send(env, chatId, t(lang, "deploy_title"), { reply_markup: deployMarkup(lang) });
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

/* Which product a question is about, so the person who runs Cloudflare panels
 * and the person who runs VPS nodes can each see at a glance what is theirs.
 *
 * INFERRED, never demanded. Asking the user to classify their own problem is
 * asking them to know the answer before they ask the question, and the ones who
 * most need support are the least able to. So this guesses and the card carries
 * a one-tap correction, which is also the only honest way to present a guess.
 *
 * Two signals, strongest first:
 *   1. The flow they were last in. Someone who just pressed "Nova on your own
 *      VPS" and then wrote is asking about the server. This is recorded on the
 *      button press and is by far the better signal.
 *   2. Words in the message, as a fallback for people who write without
 *      touching a button first. Deliberately narrow: terms that belong to one
 *      product and not the other, in both languages. "پنل" is absent on purpose,
 *      since both products have one.
 */
export const PRODUCTS = {
  proxy: { tag: "🟣 Proxy", fa: "پروکسی" },
  server: { tag: "🔵 Server", fa: "سرور" },
};

const SERVER_WORDS = /\b(vps|ssh|ubuntu|debian|sudo|root|node|xray|sing-?box|hysteria|amnezia|wireguard|systemctl|nova-node|installer)\b|سرور|وی ?پی ?اس|نود|اس ?اس ?اچ/i;
const PROXY_WORDS = /\b(cloudflare|worker|workers\.dev|d1|kv|api ?token|subdomain|zone)\b|کلودفلر|ورکر|توکن|ساب ?دامین/i;

export async function inferProduct(env, userId, said) {
  const flow = await getConfig(env, `flow_${userId}`, "");
  if (flow === "server" || flow === "proxy") return flow;
  const text = String(said || "");
  const server = SERVER_WORDS.test(text);
  const proxy = PROXY_WORDS.test(text);
  // Only decide on an unambiguous hit. A message mentioning both is not
  // evidence, and the default is the product most users are here for.
  if (server && !proxy) return "server";
  return "proxy";
}

// Admin-group action buttons shown under every forwarded message / whois card.
// Labels are bilingual (EN / FA) since the group has no single language. Once
// an admin has answered, the Reply button turns green and reads "Replied".
// draftQaId adds a one-tap "Send draft" button for the AI-drafted reply.
//
// Close and Suggestion write `source` on the qa_log row: an admin deciding a
// question needs no reply, and an admin marking it as a product suggestion
// rather than a support request. Both existed before and are rebuilt against
// the values already in the database.
export function contactKb(userId, banned, replied, draftQaId = null, qaId = null, product = null) {
  const rows = [];
  if (draftQaId && !replied) {
    rows.push([{ text: "🤖 Send AI draft / ارسال پیش‌نویس", callback_data: `dok:${draftQaId}`, style: "success" }]);
  }
  rows.push([
    replied
      ? { text: "✅ Replied / پاسخ داده شد", callback_data: `reply:${userId}`, style: "success" }
      : { text: "✍️ Reply / پاسخ", callback_data: `reply:${userId}`, style: "primary" },
    banned
      ? { text: "✅ Unblock / رفع مسدودی", callback_data: `unban:${userId}` }
      : { text: "🚫 Block / مسدود", callback_data: `ban:${userId}`, style: "danger" },
  ]);
  if (qaId) {
    rows.push([
      { text: "🗑 Close / بستن", callback_data: `qclose:${qaId}` },
      { text: "💡 Suggestion / پیشنهاد", callback_data: `qsugg:${qaId}` },
    ]);
    // The correction, showing what it would BECOME rather than what it is, so
    // the button says what pressing it does.
    if (product) {
      const other = product === "server" ? "proxy" : "server";
      rows.push([{
        text: `↔ Not ${PRODUCTS[product].tag.split(" ")[1]}? → ${PRODUCTS[other].tag}`,
        callback_data: `qtag:${qaId}:${other}`,
      }]);
    }
  }
  return { inline_keyboard: rows };
}

/* The keyboard for a card that already EXISTS. Reply and Block re-render the
 * card, and if they rebuild it from only the arguments they happen to have, the
 * Close, Suggestion and tag rows vanish the moment an admin answers, which is
 * exactly when the rest of the row is still wanted. So every re-render resolves
 * the same qa_id and tag the card was built with. */
/* Editing a card without destroying it.
 *
 * `cb.message.text` is the card with all its formatting stripped, so the obvious
 * edit (re-send that text as HTML) silently flattens every bold name and italic
 * line in the card. Telegram's answer is to send the plain text back together
 * with its `entities`, which is what these two do. Appending at the END matters
 * for the same reason: entity offsets are absolute, so anything inserted ahead
 * of them would slide the formatting off the words it belongs to.
 */
async function editCard(env, chatId, msgId, message, text, entities, kb) {
  const isCaption = !!(message && message.caption);
  return tg(env, isCaption ? "editMessageCaption" : "editMessageText", {
    chat_id: chatId, message_id: msgId,
    ...(isCaption
      ? { caption: text.slice(0, 1024), caption_entities: entities }
      : { text: text.slice(0, 4096), entities }),
    ...(kb ? { reply_markup: kb } : {}),
  }).catch((e) => console.log("card edit failed", e && e.message));
}

function cardBody(message) {
  const text = (message && (message.text || message.caption)) || "";
  const entities = (message && (message.entities || message.caption_entities)) || [];
  return { text, entities };
}

async function appendToCard(env, chatId, msgId, message, note, kb) {
  const { text, entities } = cardBody(message);
  return editCard(env, chatId, msgId, message, text + note, entities, kb);
}

/* Swapping the product chip. Same length in code units either way (both tags are
 * one emoji plus one word), but the words differ in length, so any entity that
 * starts after the chip has to shift by the difference or the card's formatting
 * walks sideways every time someone corrects a tag. */
async function retagCard(env, chatId, msgId, message, product) {
  const { text, entities } = cardBody(message);
  const other = product === "server" ? "proxy" : "server";
  const from = PRODUCTS[other].tag, to = PRODUCTS[product].tag;
  const at = text.indexOf(from);
  if (at < 0) return; // already carries this tag, or the card predates tagging
  // UTF-16 code units, because that is the unit Telegram counts offsets in.
  const delta = to.length - from.length;
  const shifted = delta === 0 ? entities : entities.map((e) =>
    e.offset > at ? { ...e, offset: e.offset + delta } : e);
  return editCard(env, chatId, msgId, message, text.slice(0, at) + to + text.slice(at + from.length), shifted, null);
}

async function cardKbFor(env, groupMsgId, userId, banned, replied) {
  const row = await env.DB.prepare(
    "SELECT qa_id FROM contact_map WHERE group_msg_id = ?"
  ).bind(groupMsgId).first().catch(() => null);
  const qaId = (row && row.qa_id) || null;
  const stored = qaId ? await getConfig(env, `qprod_${qaId}`, "") : "";
  return contactKb(userId, banned, replied, null, qaId, PRODUCTS[stored] ? stored : null);
}

// Every support message is logged to qa_log. In 'auto' mode the AI answers the
// user directly when confident. In 'draft' mode (human in the loop, the default
// until the knowledge base matures) the AI only saves a draft; the question is
// forwarded to the admins, who send or edit the draft from the group card or
// the panel. Anything else (AI off, no provider, API error) goes to the admin
// group exactly as before, with no draft attached.
// An attachment a user can send with (or instead of) their question. Detecting
// it lets the router accept the message and lets forwardContact relay the real
// file. The label is only used as a placeholder in the card when there is no
// caption. copyMessage relays the file itself, so this list just needs to cover
// what counts as "has an attachment".
function contactMedia(msg) {
  if (!msg) return null;
  if (msg.photo && msg.photo.length) return { kind: "photo", label: "📷 Photo" };
  if (msg.video) return { kind: "video", label: "🎬 Video" };
  if (msg.animation) return { kind: "animation", label: "🎬 GIF" };
  if (msg.document) return { kind: "document", label: "📎 File" };
  if (msg.voice) return { kind: "voice", label: "🎤 Voice message" };
  if (msg.video_note) return { kind: "video_note", label: "🎥 Video note" };
  if (msg.audio) return { kind: "audio", label: "🎵 Audio" };
  return null;
}

async function handleContactMessage(env, from, chatId, msg, lang) {
  const media = contactMedia(msg);
  // A captioned photo or video: treat the caption as the question text.
  const question = (msg.text || msg.caption || "").trim();
  const qaId = question ? await logQuestion(env, from.id, lang, question).catch(() => null) : null;

  // Skip the AI assistant when the message carries an attachment: a text model
  // can't see it, so a human should look. Attachments always go to the group.
  if (question && !media && (await aiEnabled(env))) {
    const mode = await getConfig(env, "ai_mode", "draft");
    await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
    if (mode !== "auto") {
      // Draft mode: nothing user-facing waits on the model, so forward to the
      // humans FIRST (the platform kills slow background work ~30s after the
      // webhook response), then attach the AI draft to the card once ready.
      const fw = await forwardContact(env, from, chatId, msg, lang, { qaId });
      const r = await Promise.race([
        autoAnswer(env, question, lang).catch((e) => {
          console.log("ai: draft failed for qa", qaId, e && e.message);
          return null;
        }),
        new Promise((res) => setTimeout(() => res(null), 20000)),
      ]);
      if (!(r && r.answer)) {
        console.log("ai: no draft for qa", qaId, "(model error or timeout)");
        return;
      }
      // A human reads every draft here, so keep the unsure ones too: they are
      // still a head start to edit. The model's confidence flag is noisy, so it
      // only decides how loudly the card warns the reviewer, never whether the
      // draft exists. (In auto mode below, it still gates sending outright.)
      const sure = r.confident === true;
      console.log("ai: draft saved for qa", qaId, sure ? "(confident)" : "(unsure)");
      await setQaDraft(env, qaId, r.answer, sure).catch(() => {});
      const group = await getConfig(env, "contact_group_id", "");
      if (group && fw && fw.cardMsgId) {
        const header = sure
          ? "🤖 <b>AI draft</b> / پیش‌نویس:"
          : "🤖 <b>AI draft</b> / پیش‌نویس\n⚠️ <i>The model was unsure, check it before sending / مدل مطمئن نبود، قبل از ارسال بررسی کنید</i>";
        const btn = sure
          ? "🤖 Send AI draft / ارسال پیش‌نویس"
          : "⚠️ Send anyway / با این حال ارسال کن";
        const sent = await send(env, group,
          `${header}\n<blockquote>${esc(r.answer)}</blockquote>`, {
            reply_to_message_id: fw.cardMsgId,
            reply_markup: { inline_keyboard: [[
              { text: btn, callback_data: `dok:${qaId}`, style: sure ? "success" : "primary" },
            ]] },
          });
        if (sent && sent.result && sent.result.message_id) {
          await env.DB.prepare(
            "INSERT OR REPLACE INTO contact_map (group_msg_id, user_id, card_msg_id, qa_id) VALUES (?, ?, ?, ?)"
          ).bind(sent.result.message_id, from.id, fw.cardMsgId, qaId).run().catch(() => {});
        }
      }
      return;
    }
    // Auto mode: the user is actively waiting, keep the cap tight and fall
    // through to the human forward when the model is slow or unsure.
    const r = await Promise.race([
      autoAnswer(env, question, lang).catch(() => null),
      new Promise((res) => setTimeout(() => res(null), 15000)),
    ]);
    if (!r) console.log("ai: no confident answer in time, forwarding to humans");
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
  if (!group) { await send(env, chatId, t(lang, "contact_notset")); return {}; }

  const media = contactMedia(msg);
  const said = (msg.text || msg.caption || "").trim();
  const card = await gatherUserCard(env, from.id, from);
  /* Bilingual, because the admin group is. This card had EN / FA on every line
   * before a deploy from a stale repo reverted it to English only. */
  const product = await inferProduct(env, from.id, said);
  const intro = (note ? note + "\n\n" : "")
    // The tag is a Latin word directly after a Farsi one, which is the same leak
    // in miniature. retagCard still finds it: indexOf matches inside the
    // isolates and the swap leaves them in place.
    + `✉️ <b>New message</b> / پیام جدید   ${bidi(PRODUCTS[product].tag)}\n\n`;
  const tail = `\n\n<i>Tap Reply below, or reply to this message, to answer them. / `
    + `برای پاسخ، دکمهٔ «پاسخ» را بزنید یا روی همین پیام ریپلای کنید.</i>`;
  const kb = contactKb(from.id, false, false, null, qaId, product);
  // Caption when the attachment itself is the card: the user's words (if any),
  // then the identity. No "[photo]" placeholder, since the media is right there.
  const mediaCaption = intro + (said ? `“${esc(said)}”\n\n` : "") + card.text + tail;
  // Text card (also the fallback when a caption would be too long or the media
  // type can't carry one): quote the words or a short attachment placeholder.
  const textHeader =
    intro + (said ? `“${esc(said)}”` : media ? `<i>[${media.label}]</i>` : "“”") + `\n\n` + card.text + tail;

  let cardMsgId = null;
  if (media) {
    // Relay the attachment AS the card, so the Reply and Block buttons sit right
    // on the photo/video the admins see.
    const copied = await tg(env, "copyMessage", {
      chat_id: group, from_chat_id: chatId, message_id: msg.message_id,
      caption: mediaCaption, parse_mode: "HTML", reply_markup: kb,
    }).catch(() => null);
    if (copied && copied.ok && copied.result) {
      cardMsgId = copied.result.message_id;
    } else {
      // Caption too long, or a media type that can't carry one (video note):
      // fall back to a text card with the buttons, then the media beneath it.
      const sent = await send(env, group, textHeader, { reply_markup: kb });
      cardMsgId = sent && sent.result && sent.result.message_id;
      if (cardMsgId) {
        await tg(env, "copyMessage", {
          chat_id: group, from_chat_id: chatId, message_id: msg.message_id,
          reply_to_message_id: cardMsgId,
        }).catch((e) => console.log("contact: media copy failed", e && e.message));
      }
    }
  } else {
    const sent = await send(env, group, textHeader, { reply_markup: kb });
    cardMsgId = sent && sent.result && sent.result.message_id;
  }
  if (cardMsgId) {
    await env.DB.prepare(
      "INSERT OR REPLACE INTO contact_map (group_msg_id, user_id, card_msg_id, qa_id) VALUES (?, ?, ?, ?)"
    ).bind(cardMsgId, from.id, cardMsgId, qaId).run();
    if (qaId) await setConfig(env, `qprod_${qaId}`, product);
  }
  await send(env, chatId, t(lang, "contact_sent"), { reply_markup: { inline_keyboard: [backRow(lang)] } });
  return { cardMsgId };
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
  // A reply carries text or any attachment (photo, video, file, and so on) with
  // an optional caption. Stickers and the like still aren't relayed.
  const media = contactMedia(msg);
  const caption = (msg.caption || "").trim();
  if (!reply || (!msg.text && !media)) return;
  const row = await env.DB.prepare(
    "SELECT user_id, card_msg_id FROM contact_map WHERE group_msg_id = ?"
  ).bind(reply.message_id).first();
  if (!row) return;
  const userId = row.user_id;
  const lang = (await getUserLang(env, userId)) || "en";
  const prefix = t(lang, "reply_prefix");
  // An attachment is copied to the user with the support prefix in its caption
  // so they know who it's from. Video notes can't carry a caption, so the prefix
  // goes as a separate line first. A plain text reply keeps the original path.
  let res;
  if (media) {
    const canCaption = media.kind !== "video_note";
    if (!canCaption) await send(env, userId, prefix);
    res = await tg(env, "copyMessage", {
      chat_id: userId,
      from_chat_id: msg.chat.id,
      message_id: msg.message_id,
      ...(canCaption
        ? { caption: caption ? `${prefix}\n\n${esc(caption)}` : prefix, parse_mode: "HTML" }
        : {}),
    });
  } else {
    res = await send(env, userId, `${prefix}\n\n${esc(msg.text)}`);
  }
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
    // Record the delivered reply as the human answer to the question this card
    // carries, so the AI learns from it. An attachment with no caption has no
    // text to learn from: mark it answered (source 'media') so it leaves the
    // Waiting inbox, but keep it out of the knowledge pack.
    const answerText = msg.text || caption;
    if (answerText) await setQaAnswerByCard(env, cardId, answerText).catch(() => {});
    else await setQaAnswerByCard(env, cardId, "📎", "media").catch(() => {});
    const banned = await isBanned(env, userId);
    await tg(env, "editMessageReplyMarkup", {
      chat_id: msg.chat.id, message_id: cardId,
      reply_markup: await cardKbFor(env, cardId, userId, banned, true),
    }).catch(() => {});
  }
}

// ── Community group: membership gate + nightly cleanup ───────────────────────

// A message counts as a channel post to keep if Telegram auto-forwarded it from
// the linked channel, or it was manually forwarded from that channel.
function isChannelPost(msg, chanSlug) {
  if (msg.is_automatic_forward) return true;
  const src = msg.forward_from_chat;
  if (src && src.type === "channel") {
    const u = (src.username || "").toLowerCase();
    if (chanSlug && u === chanSlug.toLowerCase()) return true;
    if (msg.sender_chat && msg.sender_chat.id === src.id) return true;
  }
  return false;
}

// Record a community message so the nightly sweep knows it exists. keep = 1
// means a channel post the sweep must never delete.
async function logGroupMsg(env, chatId, messageId, keep) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO group_messages (chat_id, message_id, ts, keep) VALUES (?, ?, ?, ?)"
  ).bind(String(chatId), messageId, Date.now(), keep ? 1 : 0).run().catch(() => {});
}

// Group admins (and the group owner) post freely, gate or not. Cached 15 min.
async function isGroupAdmin(env, chatId, userId) {
  const key = `gadmin_${chatId}_${userId}`;
  if (await getConfig(env, key, "")) return true;
  const r = await tg(env, "getChatMember", { chat_id: chatId, user_id: userId }).catch(() => null);
  const st = r && r.ok && r.result && r.result.status;
  const admin = st === "creator" || st === "administrator";
  if (admin) await setConfig(env, key, "1");
  return admin;
}

async function handleCommunityMessage(msg, env) {
  const chatId = msg.chat.id;

  // /id still works here so an admin can read the group's own id.
  if ((msg.text || "").toLowerCase().startsWith("/id")) {
    await send(env, chatId, `This chat's ID:\n<code>${chatId}</code>`);
    return;
  }

  // Service messages (joins, leaves, pins) get logged so the sweep can clear
  // them too, but they are not gated.
  if (msg.new_chat_members || msg.left_chat_member || msg.new_chat_title ||
      msg.pinned_message || msg.new_chat_photo) {
    await logGroupMsg(env, chatId, msg.message_id, false);
    return;
  }

  const from = msg.from;
  if (!from || from.is_bot) {
    // Anonymous admins and channel posts arrive without a normal `from`.
    const chan = channelSlug(await getConfig(env, "join_channel", ""));
    await logGroupMsg(env, chatId, msg.message_id, isChannelPost(msg, chan));
    return;
  }

  const chan = channelSlug(await getConfig(env, "join_channel", ""));
  const keep = isChannelPost(msg, chan);
  await logGroupMsg(env, chatId, msg.message_id, keep);
  if (keep) return;

  // Profanity filter: delete + escalate (warn -> mute -> ban). If it acted on
  // this message, stop here so the membership gate below does not double-handle.
  if (await moderateProfanity(env, chatId, msg, from)) return;

  // Membership gate: non-members lose their message until they join. Group
  // admins are exempt. requireMember fails OPEN, so if the bot is not a channel
  // admin the check errors and nobody is gated (a config mistake cannot wipe
  // the group); it starts working once the bot can actually read membership.
  if ((await getConfig(env, "community_gate", "1")) !== "1") return;
  if (await isGroupAdmin(env, chatId, from.id)) return;
  const m = await requireMember(env, from.id);
  if (m.ok) return;
  await deleteMessage(env, chatId, msg.message_id).catch(() => {});
  await notifyGate(env, chatId, from, m.chan);
}

// One short "join the channel first" notice per non-member, rate-limited to 10
// minutes so a spammer cannot flood the group with notices. The notice is
// logged so the nightly sweep clears it as well.
async function notifyGate(env, chatId, from, chan) {
  const key = `gate_note_${from.id}`;
  const last = Number(await getConfig(env, key, "0"));
  if (Date.now() - last < 10 * 60 * 1000) return;
  await setConfig(env, key, String(Date.now()));
  const name = esc(from.first_name || "there");
  const link = chan ? `https://t.me/${chan}` : "";
  const text = `👋 <a href="tg://user?id=${from.id}">${name}</a>, ` +
    `to chat here please join our channel first / برای گفتگو ابتدا در کانال ما عضو شوید` +
    (link ? `\n${link}` : "");
  const sent = await send(env, chatId, text).catch(() => null);
  if (sent && sent.ok && sent.result) {
    await logGroupMsg(env, chatId, sent.result.message_id, false);
  }
}

// Normalize text for the profanity match: lowercase, drop zero-width joiners,
// and fold common Arabic/Persian letter variants so simple obfuscation
// (spacing, ك/ک, ي/ی) does not slip a banned word past the filter.
function normalizeProfanity(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\u200b\u200c\u200d\u200e\u200f]/g, "")
    .replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

// Profanity moderation. When enabled, a member message that matches the admin
// wordlist is deleted, the sender gets a strike, and enforcement escalates:
// early strikes warn, then mute (restrictChatMember), then ban (banChatMember +
// bot ban). Group admins are exempt. Notices are logged so the nightly sweep
// clears them. We never expose anyone's account, this only moderates. Returns
// true when it acted on the message.
async function moderateProfanity(env, chatId, msg, from) {
  if ((await getConfig(env, "profanity_on", "0")) !== "1") return false;
  const raw = msg.text || msg.caption || "";
  if (!raw) return false;
  const words = normalizeProfanity(await getConfig(env, "profanity_words", ""))
    .split(/[\n,،]+/).map((w) => w.trim()).filter(Boolean);
  if (!words.length) return false;
  const hay = normalizeProfanity(raw);
  if (!words.some((w) => hay.includes(w))) return false;
  if (await isGroupAdmin(env, chatId, from.id).catch(() => false)) return false;

  await deleteMessage(env, chatId, msg.message_id).catch(() => {});

  const n = await bumpOffense(env, from, raw);
  const muteAt = Math.max(2, Number(await getConfig(env, "profanity_mute", "3")) || 3);
  const banAt = Math.max(muteAt + 1, Number(await getConfig(env, "profanity_ban", "5")) || 5);
  const muteMin = Math.max(1, Number(await getConfig(env, "profanity_mute_min", "60")) || 60);
  const name = `<a href="tg://user?id=${from.id}">${esc(from.first_name || "member")}</a>`;

  let notice;
  if (n >= banAt) {
    await tg(env, "banChatMember", { chat_id: chatId, user_id: from.id }).catch(() => {});
    await setBanned(env, from.id, true).catch(() => {});
    await setOffenderStatus(env, from.id, "banned", 0).catch(() => {});
    notice = `🚫 ${bidi(name)} was removed for repeated abusive messages.\nبه‌دلیل پیام‌های توهین‌آمیز مکرر حذف شد.`;
  } else if (n >= muteAt) {
    await tg(env, "restrictChatMember", {
      chat_id: chatId, user_id: from.id,
      until_date: Math.floor(Date.now() / 1000) + muteMin * 60,
      permissions: {
        can_send_messages: false, can_send_media_messages: false,
        can_send_other_messages: false, can_add_web_page_previews: false,
      },
    }).catch(() => {});
    await setOffenderStatus(env, from.id, "muted", Date.now() + muteMin * 60000).catch(() => {});
    notice = `🔇 ${bidi(name)}, muted ${muteMin} min for abusive language.\nبه‌دلیل زبان توهین‌آمیز ${muteMin} دقیقه بی‌صدا شدی.`;
  } else {
    notice = `⚠️ ${bidi(name)}, please keep it civil, abusive messages are removed.\nلطفاً ادب را رعایت کن؛ پیام‌های توهین‌آمیز حذف می‌شوند.`;
  }
  const sent = await send(env, chatId, notice).catch(() => null);
  if (sent && sent.ok && sent.result) {
    await logGroupMsg(env, chatId, sent.result.message_id, false).catch(() => {});
  }
  return true;
}

// Nightly sweep: delete the day's community messages except channel posts.
// Telegram only lets a bot delete messages under 48h old that it logged, so we
// work from group_messages and cap the run to stay inside the cron's budget.
export async function sweepCommunityGroup(env) {
  if ((await getConfig(env, "community_cleanup", "0")) !== "1") return { skipped: "off" };
  const chatId = await getConfig(env, "community_group_id", "");
  if (!chatId) return { skipped: "no group" };

  const now = Date.now();
  const under48h = now - 47 * 3600 * 1000;
  const CAP = 200;
  const { results } = await env.DB.prepare(
    "SELECT message_id FROM group_messages WHERE chat_id = ? AND keep = 0 AND ts >= ? " +
    "ORDER BY message_id DESC LIMIT ?"
  ).bind(String(chatId), under48h, CAP + 1).all().catch(() => ({ results: [] }));
  const rows = results || [];
  const capped = rows.length > CAP;
  const todo = rows.slice(0, CAP);

  let deleted = 0;
  for (const row of todo) {
    const r = await deleteMessage(env, chatId, row.message_id).catch(() => null);
    // Drop the row either way: a message over 48h or already gone will not come
    // back, so keeping it would only make the next sweep retry it forever.
    await env.DB.prepare("DELETE FROM group_messages WHERE chat_id = ? AND message_id = ?")
      .bind(String(chatId), row.message_id).run().catch(() => {});
    if (r && r.ok) deleted++;
    await new Promise((res) => setTimeout(res, 45)); // ~22/s, under Telegram's limit
  }

  // Prune anything older than 48h (undeletable) so the table stays small.
  await env.DB.prepare("DELETE FROM group_messages WHERE ts < ?")
    .bind(now - 48 * 3600 * 1000).run().catch(() => {});

  if (capped) console.log(`community sweep hit the ${CAP}-message cap; more remain for the next run`);
  return { deleted, considered: todo.length, capped };
}
