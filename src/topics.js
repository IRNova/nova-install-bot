/* Routing support cards into per-product topics in the admin group.
 *
 * The product tag told an admin what a card was about; it did not help them find
 * the cards that were theirs. In a group taking hundreds of messages, "look at
 * every card and read the chip" is not a workflow. Telegram forum topics are,
 * and they cost the team nothing to learn: a server person opens the 🔵 Server
 * topic and everything in it is theirs.
 *
 * Everything here degrades rather than fails. A group with topics switched off,
 * a bot without manage_topics, a topic someone deleted by hand: each falls back
 * to posting in the group exactly as before. Support tickets not reaching the
 * group at all is far worse than support tickets reaching it unsorted.
 */
import { tg } from "./telegram.js";
import { getConfig, setConfig } from "./db.js";

/* Telegram accepts only these six icon colours for a forum topic; anything else
 * is rejected outright. Purple and blue are the two that match the 🟣 / 🔵 chips
 * already on the cards. */
export const TOPICS = {
  proxy: { key: "topic_proxy", name: "🟣 Proxy", color: 0xcb86db },
  server: { key: "topic_server", name: "🔵 Server", color: 0x6fb9f0 },
};

const FORUM_KEY = "admin_forum";

/* Is the admin group a forum?
 *
 * A yes is cached forever: a group does not stop being a forum, and if it ever
 * did, sending to a dead thread already falls back on its own.
 *
 * A no has to EXPIRE, and getting that wrong is the whole difference between
 * this feature working and appearing not to exist. Turning Topics on is a
 * Telegram group setting the owner changes by hand, long after the bot last
 * looked. Caching "not a forum" permanently means they follow the instructions,
 * see no change, and reasonably conclude the feature is broken. An hour is short
 * enough that nobody is left wondering and long enough to cost one getChat.
 */
const FORUM_RECHECK_MS = 60 * 60 * 1000;

async function isForum(env, group) {
  const cached = await getConfig(env, FORUM_KEY, "");
  if (cached === "1") return true;
  if (cached.startsWith("0:")) {
    const age = Date.now() - Number(cached.slice(2));
    if (age >= 0 && age < FORUM_RECHECK_MS) return false;
  }
  const r = await tg(env, "getChat", { chat_id: group }).catch(() => null);
  // An unreachable API is not evidence either way, so don't cache a guess.
  if (!r || r.ok !== true) return false;
  const forum = !!(r.result && r.result.is_forum);
  await setConfig(env, FORUM_KEY, forum ? "1" : `0:${Date.now()}`).catch(() => {});
  return forum;
}

/* The thread id to post a card of this product into, or null to post in the
 * group itself. Creates the topic the first time and remembers it. */
export async function productThread(env, group, product) {
  const spec = TOPICS[product];
  if (!group || !spec) return null;
  if (!(await isForum(env, group))) return null;

  const existing = await getConfig(env, spec.key, "");
  if (existing) return Number(existing);

  const r = await tg(env, "createForumTopic", {
    chat_id: group, name: spec.name, icon_color: spec.color,
  }).catch(() => null);
  if (!r || r.ok !== true || !r.result) {
    /* Almost always a missing manage_topics permission. Recorded so this does
     * not attempt a create on every message, and recorded with a timestamp so
     * granting the permission takes effect on its own within the hour. */
    await setConfig(env, FORUM_KEY, `0:${Date.now()}`).catch(() => {});
    return null;
  }
  const id = r.result.message_thread_id;
  await setConfig(env, spec.key, String(id)).catch(() => {});
  return id;
}

/* Telegram rejects a thread that no longer exists rather than falling back to
 * the group, so a topic deleted by hand would silently swallow every card of
 * that product. Detect exactly that, forget the id, and let the caller retry. */
export function threadIsGone(res) {
  if (!res || res.ok !== false) return false;
  return /thread not found|TOPIC_DELETED|message thread not found/i.test(String(res.description || ""));
}

export async function forgetThread(env, product) {
  const spec = TOPICS[product];
  if (spec) await setConfig(env, spec.key, "").catch(() => {});
}

/* Send into a product's topic, retrying in the group itself if the topic has
 * gone. `sendFn` takes the extra fields to merge into the API call, so this
 * works for a text card and a copied media card alike. */
export async function sendToProduct(env, group, product, sendFn) {
  const thread = await productThread(env, group, product);
  if (!thread) return sendFn({});
  const r = await sendFn({ message_thread_id: thread });
  if (threadIsGone(r)) {
    await forgetThread(env, product);
    return sendFn({});
  }
  return r;
}

/* Move an existing card into another product's topic.
 *
 * Telegram has no "move message" call, so this copies the card into the target
 * topic and deletes the original. copyMessage carries the text or the media and
 * its caption across unchanged, which is why it works for both card shapes; the
 * keyboard is not copied, so the caller passes it back in.
 *
 * Returns the new message id, or null if the card could not be moved and was
 * therefore left exactly where it was.
 */
export async function moveCardToProduct(env, group, cardMsgId, product, replyMarkup) {
  const thread = await productThread(env, group, product);
  if (!thread) return null;
  const copied = await tg(env, "copyMessage", {
    chat_id: group, from_chat_id: group, message_id: cardMsgId,
    message_thread_id: thread, reply_markup: replyMarkup,
  }).catch(() => null);
  if (!copied || copied.ok !== true || !copied.result) return null;
  // Only once the copy is confirmed: a delete that runs first and a copy that
  // then fails loses the ticket.
  await tg(env, "deleteMessage", { chat_id: group, message_id: cardMsgId }).catch(() => {});
  return copied.result.message_id;
}
