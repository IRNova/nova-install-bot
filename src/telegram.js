// Thin wrappers over the Telegram Bot API.

export async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json().catch(() => ({}));
}

export function send(env, chatId, text, extra = {}) {
  return tg(env, "sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML",
    disable_web_page_preview: true, ...extra,
  });
}

export function edit(env, chatId, messageId, text, extra = {}) {
  return tg(env, "editMessageText", {
    chat_id: chatId, message_id: messageId, text, parse_mode: "HTML",
    disable_web_page_preview: true, ...extra,
  });
}

// Send a photo (by URL or file_id) with an HTML caption.
export function sendPhoto(env, chatId, photo, caption, extra = {}) {
  return tg(env, "sendPhoto", {
    chat_id: chatId, photo, caption, parse_mode: "HTML", ...extra,
  });
}

export function editCaption(env, chatId, messageId, caption, extra = {}) {
  return tg(env, "editMessageCaption", {
    chat_id: chatId, message_id: messageId, caption, parse_mode: "HTML", ...extra,
  });
}

export function answerCb(env, id, text, showAlert) {
  return tg(env, "answerCallbackQuery", {
    callback_query_id: id, text: text || "", show_alert: !!showAlert,
  });
}

export function deleteMessage(env, chatId, messageId) {
  return tg(env, "deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => {});
}

// Escape user-supplied text before putting it inside an HTML-parsed message.
export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
