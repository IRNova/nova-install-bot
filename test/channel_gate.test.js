/* The channel gate: only members of the channel may use the bot.
 *
 * The gate was never in the wrong place. Every user-facing path went through it.
 * What was wrong is what it did when the check did not answer: ANY non-ok reply
 * from getChatMember was read as "yes". That covers a 429 from flood control, a
 * 5xx, a gateway page that is not JSON, and a dropped connection, so the gate
 * stood open during precisely the conditions that can be provoked, and it did so
 * without logging anything, which is why it could have been happening for months
 * unnoticed.
 *
 * The distinction these tests pin is between "we cannot check anyone" (the
 * channel or the bot's rights are misconfigured, so refusing helps nobody) and
 * "we could not check this time" (transient, so refuse and let the user tap
 * "I've joined").
 */
import test from "node:test";
import assert from "node:assert/strict";
import { handleUpdate } from "../src/bot.js";

const CHAN = "irnova_proxy";

/* A D1 stub plus a Telegram stub whose getChatMember reply the test dictates. */
function harness(chatMemberReply, seed = {}) {
  const config = new Map([["join_required", "1"], ["join_channel", CHAN], ...Object.entries(seed)]);
  const writes = [], calls = [];
  const env = {
    BOT_TOKEN: "t:t",
    DB: {
      prepare(sql) {
        const run = async () => {
          if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) writes.push(sql.replace(/\s+/g, " ").slice(0, 60));
          return { meta: { changes: 1 } };
        };
        return {
          bind: (...b) => ({
            first: async () => {
              if (/FROM config WHERE key = \?/.test(sql)) {
                const v = config.get(b[0]);
                return v === undefined ? null : { value: v };
              }
              if (/FROM users/.test(sql)) return { banned: 0, lang: "en" };
              return null;
            },
            all: async () => ({ results: [] }),
            run: async () => {
              if (/INSERT INTO config/i.test(sql)) config.set(b[0], String(b[1]));
              return run();
            },
          }),
          first: async () => null, all: async () => ({ results: [] }), run,
        };
      },
    },
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const method = String(url).split("/").pop();
    const body = JSON.parse((init && init.body) || "{}");
    calls.push({ method, body });
    if (method === "getChatMember") return { ok: true, json: async () => chatMemberReply() };
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 1 } }) };
  };
  return { env, calls, writes, config, restore: () => { globalThis.fetch = realFetch; } };
}

const start = (id = 5150) => ({
  update_id: 1,
  message: {
    message_id: 1, date: 1, chat: { id, type: "private" },
    from: { id, is_bot: false, first_name: "U", language_code: "en" }, text: "/start",
  },
});

// The join prompt is the refusal; the menu is service.
const wasRefused = (h) => h.calls.some((c) =>
  c.method === "sendMessage" && JSON.stringify(c.body.reply_markup || {}).includes("t.me/" + CHAN));

async function run(reply, seed = {}, id = 5150) {
  const h = harness(reply, seed);
  try { await handleUpdate(start(id), h.env); } finally { h.restore(); }
  return h;
}

test("a member is served", async () => {
  const h = await run(() => ({ ok: true, result: { status: "member" } }));
  assert.ok(!wasRefused(h), "a real member was shown the join prompt");
});

test("left and kicked are refused", async () => {
  for (const status of ["left", "kicked"]) {
    const h = await run(() => ({ ok: true, result: { status } }));
    assert.ok(wasRefused(h), `status "${status}" was let through`);
  }
});

test("a transient failure now refuses instead of letting everyone in", async () => {
  /* The finding. Each of these used to return {ok:true} and open the bot to
   * anyone for as long as the condition lasted, and a 429 is reachable on
   * purpose by hammering the bot. */
  const transient = [
    ["429 flood control", () => ({ ok: false, error_code: 429, description: "Too Many Requests: retry after 30" })],
    ["500 from Telegram", () => ({ ok: false, error_code: 500, description: "Internal Server Error" })],
    ["non-JSON gateway page", () => ({})],
    ["dropped connection", () => { throw new Error("connection reset"); }],
  ];
  for (const [label, reply] of transient) {
    const h = await run(reply);
    assert.ok(wasRefused(h), `let a non-member in on: ${label}`);
  }
});

test("a misconfigured channel still fails open, deliberately", async () => {
  /* The one case worth keeping open. If the bot was demoted or the channel was
   * renamed then NOBODY can be checked, and locking out every user punishes them
   * for the owner's settings. This is the narrow exception, not the default. */
  for (const description of ["Bad Request: chat not found", "Bad Request: bot is not a member of the channel chat"]) {
    const h = await run(() => ({ ok: false, error_code: 400, description }));
    assert.ok(!wasRefused(h), `config error should fail open: ${description}`);
  }
});

test("a confirmed member is cached, and a non-member is cached only briefly", async () => {
  const h = harness(() => ({ ok: true, result: { status: "member" } }));
  try { await handleUpdate(start(777), h.env); } finally { h.restore(); }
  const cached = h.config.get("member_777");
  assert.ok(cached && !cached.startsWith("!"), `member not cached: ${cached}`);

  /* The negative cache is what stops the "I've joined" button being an unlimited
   * getChatMember mint: pressing it in a loop hits the cache, not Telegram. */
  const n = harness(() => ({ ok: true, result: { status: "left" } }));
  try { await handleUpdate(start(778), n.env); } finally { n.restore(); }
  assert.match(n.config.get("member_778") || "", /^!\d+/, "a refusal was not cached at all");
});

test("a future-dated cache entry is not a permanent bypass", async () => {
  // Date.now() - future is negative, which used to satisfy "< 15 minutes".
  const future = String(Date.now() + 10 * 365 * 24 * 3600 * 1000);
  const h = await run(() => ({ ok: true, result: { status: "left" } }), { member_5150: future });
  assert.ok(wasRefused(h), "a future timestamp granted permanent access");
});

test("a non-member is not enrolled as a user", async () => {
  /* touchUser ran before the gate, so people who deliberately did not join were
   * written into `users` and then received every broadcast: the bot doing
   * something for a non-member, which is the whole thing the gate prevents. */
  const h = await run(() => ({ ok: true, result: { status: "left" } }));
  const enrolled = h.writes.some((w) => /INSERT INTO users/i.test(w));
  assert.ok(!enrolled, "a refused non-member was still added to the broadcast list");

  const m = await run(() => ({ ok: true, result: { status: "member" } }), {}, 5151);
  assert.ok(m.writes.some((w) => /INSERT INTO users/i.test(w)), "a member was not enrolled");
});

test("the refusal does not repeat for every message", async () => {
  // Unlimited replies to a spammer are both a nuisance and the main organic
  // route into the flood control the gate now fails closed on.
  const h = harness(() => ({ ok: true, result: { status: "left" } }));
  try {
    await handleUpdate(start(9001), h.env);
    const afterFirst = h.calls.filter((c) => c.method === "sendMessage").length;
    await handleUpdate(start(9001), h.env);
    await handleUpdate(start(9001), h.env);
    assert.equal(h.calls.filter((c) => c.method === "sendMessage").length, afterFirst,
      "the join prompt was sent again within the throttle window");
  } finally { h.restore(); }
});

test("turning the gate off in settings still works", async () => {
  // The owner's own switch has to keep working, or the fix is a lockout.
  const h = await run(() => ({ ok: true, result: { status: "left" } }), { join_required: "0" });
  assert.ok(!wasRefused(h), "the gate ignored join_required=0");
});

test("a future-dated refusal is not a permanent lockout either", async () => {
  /* The mirror of the bypass, and the reason the lower bound belongs on both
   * branches rather than just the one the audit named: a single impossible
   * timestamp on the negative side would refuse that user forever. Denial rather
   * than access, so less severe, but just as silent and just as permanent. */
  const future = String(Date.now() + 10 * 365 * 24 * 3600 * 1000);
  const h = await run(() => ({ ok: true, result: { status: "member" } }), { member_5150: "!" + future });
  assert.ok(!wasRefused(h), "a future-dated refusal locked a real member out forever");
});

test("losing channel admin fails open, in the words Telegram actually uses", async () => {
  /* The lockout case, and the one most easily missed by writing the list from
   * memory: when the bot is demoted or removed from the channel, Telegram does
   * not say "not enough rights", it says "member list is inaccessible" or
   * "bot was kicked". Treating those as transient would refuse every user of the
   * bot until a human noticed, which is a worse outage than the hole this whole
   * change exists to close. */
  const configErrors = [
    "Bad Request: member list is inaccessible",
    "Forbidden: bot was kicked from the channel chat",
    "Bad Request: CHAT_ADMIN_REQUIRED",
    "Bad Request: chat not found",
  ];
  for (const description of configErrors) {
    const h = await run(() => ({ ok: false, error_code: 400, description }));
    assert.ok(!wasRefused(h), `would lock everyone out on: ${description}`);
  }
});

test("the fail-open list does not swallow a transient error", async () => {
  // The other direction: the list must stay narrow, or it becomes the old bug
  // wearing a regex.
  const mustClose = [
    "Too Many Requests: retry after 30",
    "Internal Server Error",
    "Bad Gateway",
    /* Per-user errors belong here, not on the open list. Refusing one account
     * costs it one tap; opening for it hands the bypass to exactly the people
     * the gate exists to refuse, and the "do not punish 26k users" argument that
     * justifies the open list cannot apply to an error scoped to one person. */
    "Bad Request: Member not found",
    "Bad Request: PARTICIPANT_ID_INVALID",
    "Bad Request: USER_ID_INVALID",
  ];
  for (const description of mustClose) {
    const h = await run(() => ({ ok: false, error_code: 429, description }));
    assert.ok(wasRefused(h), `fail-open list is too broad, matched: ${description}`);
  }
});

/* The community group is where a closed gate is DESTRUCTIVE.
 *
 * In a DM, refusing means "here is a join button". In the group it means the
 * message is deleted. So making the gate fail closed on transient errors, which
 * is right everywhere else, quietly turned a Telegram blip into "delete every
 * message in the group, admins included", since isGroupAdmin fails closed in the
 * same conditions. Nothing tested this path, which is how it got through.
 */
function groupHarness(chatMemberReply) {
  const h = harness(chatMemberReply, { community_group_id: "-100777", community_gate: "1" });
  return h;
}

const groupMsg = (id = 4242) => ({
  update_id: 1,
  message: {
    message_id: 99, date: 1, chat: { id: -100777, type: "supergroup" },
    from: { id, is_bot: false, first_name: "M" }, text: "hello everyone",
  },
});

const deleted = (h) => h.calls.some((c) => c.method === "deleteMessage");

test("a Telegram blip never deletes a message in the community group", async () => {
  for (const [label, reply] of [
    ["429 flood control", () => ({ ok: false, error_code: 429, description: "Too Many Requests: retry after 5" })],
    ["500 from Telegram", () => ({ ok: false, error_code: 500, description: "Internal Server Error" })],
    ["dropped connection", () => { throw new Error("reset"); }],
  ]) {
    const h = groupHarness(reply);
    try { await handleUpdate(groupMsg(), h.env); } finally { h.restore(); }
    assert.ok(!deleted(h), `deleted a message during: ${label}`);
  }
});

test("a confirmed non-member still loses their message", async () => {
  // The feature has to keep working: only uncertainty is spared, not refusal.
  const h = groupHarness(() => ({ ok: true, result: { status: "left" } }));
  try { await handleUpdate(groupMsg(), h.env); } finally { h.restore(); }
  assert.ok(deleted(h), "a confirmed non-member kept their message");
});

test("a confirmed member keeps their message", async () => {
  const h = groupHarness(() => ({ ok: true, result: { status: "member" } }));
  try { await handleUpdate(groupMsg(), h.env); } finally { h.restore(); }
  assert.ok(!deleted(h), "a real member had their message deleted");
});

test("a pasted Cloudflare token is deleted even when the gate refuses", async () => {
  /* Removing a credential from a chat is the one piece of credential hygiene
   * this bot performs, and the gate's early return used to skip it. While the
   * gate failed open it only ever affected deliberate non-members; once it fails
   * closed, a real member who pastes during a blip is refused and their token
   * stays in the chat forever. */
  const withToken = (id = 6001) => ({
    update_id: 1,
    message: {
      message_id: 55, date: 1, chat: { id, type: "private" },
      from: { id, is_bot: false, first_name: "U", language_code: "en" },
      text: "here you go: " + "a".repeat(40),
    },
  });
  for (const [label, reply] of [
    ["a confirmed non-member", () => ({ ok: true, result: { status: "left" } })],
    ["a transient failure", () => ({ ok: false, error_code: 429, description: "Too Many Requests" })],
  ]) {
    const h = harness(reply);
    try { await handleUpdate(withToken(), h.env); } finally { h.restore(); }
    assert.ok(h.calls.some((c) => c.method === "deleteMessage"),
      `token left sitting in the chat for ${label}`);
  }
});
