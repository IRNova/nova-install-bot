/* Driving handleUpdate for real, instead of reading the source.
 *
 * test/support_card.test.js asserts the gate exists by matching src/bot.js as
 * TEXT. That passed while the Reply button threw `ReferenceError: group is not
 * defined` on every press, because hoisting the gate moved `const group` into
 * the if-block and left the branch below referencing a name that had stopped
 * existing. A source-text assertion cannot see that. Pressing the button can.
 *
 * So this stubs D1 and fetch and actually presses each card button, from inside
 * the admin group and from outside it, and checks two things a text test never
 * could: that nothing throws, and that a press from outside writes nothing.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { handleUpdate } from "../src/bot.js";

const GROUP = "-1004385487628";

/* Enough of D1 to run a callback: `config` answers from a map, every other read
 * returns a plausible row, and every write is recorded rather than performed. */
function stubEnv() {
  const writes = [], config = new Map([["contact_group_id", GROUP]]);
  const answer = (sql, binds) => {
    if (/FROM config WHERE key = \?/.test(sql)) {
      const v = config.get(binds[0]);
      return v === undefined ? null : { value: v };
    }
    if (/FROM qa_log/.test(sql)) return { id: 5, user_id: 777, draft: "d", answer: null, lang: "en" };
    if (/FROM contact_map/.test(sql)) return { user_id: 777, qa_id: 5, replied: 0, card_msg_id: 42 };
    if (/FROM users/.test(sql)) return { id: 777, first_name: "U", banned: 0, lang: "en" };
    return null;
  };
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind: (...binds) => ({
            first: async () => answer(sql, binds),
            all: async () => ({ results: [] }),
            run: async () => {
              if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) writes.push({ sql, binds });
              return { meta: { changes: 1 } };
            },
          }),
          first: async () => answer(sql, []),
          all: async () => ({ results: [] }),
          run: async () => ({ meta: { changes: 0 } }),
        };
      },
    },
    BOT_TOKEN: "test:token",
  };
  return { env, writes, config };
}

const press = (data, chatId) => ({
  update_id: 1,
  callback_query: {
    id: "cbid", from: { id: 424242424, is_bot: false, first_name: "Tester" },
    message: { message_id: 42, date: 1, chat: { id: chatId, type: chatId === GROUP ? "supergroup" : "private" }, text: "card" },
    chat_instance: "1", data,
  },
});

const CARD_ACTIONS = ["reply:777", "dok:5", "qclose:5", "qsugg:5", "qtag:5:server", "ban:777", "unban:777"];

// Telegram is stubbed out; record the calls so we can assert on them.
function stubFetch() {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ method: String(url).split("/").pop(), body: JSON.parse((init && init.body) || "{}") });
    return { ok: true, json: async () => ({ ok: true, result: { message_id: 43 } }) };
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

test("every card action runs without throwing, from inside the group", async () => {
  // The regression this file exists for: `reply:` threw on every press while
  // all 36 other tests passed.
  for (const data of CARD_ACTIONS) {
    const { env } = stubEnv();
    const tg = stubFetch();
    try {
      await handleUpdate(press(data, GROUP), env);
    } catch (e) {
      assert.fail(`${data} threw: ${e && e.message}`);
    } finally {
      tg.restore();
    }
  }
});

test("a card action from outside the group writes nothing", async () => {
  for (const data of CARD_ACTIONS) {
    const { env, writes } = stubEnv();
    const tg = stubFetch();
    try {
      await handleUpdate(press(data, "424242424"), env);
    } finally {
      tg.restore();
    }
    assert.deepEqual(writes, [], `${data} from a private chat wrote: ${JSON.stringify(writes)}`);
    // Exactly one Telegram call, the empty acknowledgement, and nothing else.
    const nonAck = tg.calls.filter((c) => c.method !== "answerCallbackQuery");
    assert.deepEqual(nonAck.map((c) => c.method), [], `${data} also called Telegram`);
  }
});

test("the card edit carries the message, so Telegram gets text and not an array", async () => {
  /* `editCard(env, chatId, msgId, message, text, entities, kb)` was being called
   * with six arguments, which shifted every one: `text` received the entities
   * array. Telegram 400s on that, and `tg()` resolves rather than rejects, so it
   * failed in complete silence and the card simply never changed. */
  const { env } = stubEnv();
  const tg = stubFetch();
  try {
    await handleUpdate(press("qclose:5", GROUP), env);
  } finally {
    tg.restore();
  }
  const edit = tg.calls.find((c) => /^editMessage(Text|Caption)$/.test(c.method));
  assert.ok(edit, `no card edit was attempted; calls: ${tg.calls.map((c) => c.method).join(", ")}`);
  const body = edit.body.text !== undefined ? edit.body.text : edit.body.caption;
  assert.equal(typeof body, "string", `card body is ${typeof body}, not a string`);
  assert.match(body, /Closed by/, "the card was not annotated with who closed it");
});

test("a malformed qa id never reaches a config key", async () => {
  /* The id is interpolated into `qprod_<id>`, so one press with a junk id is one
   * junk row. Asserting on the WRITE rather than on the validation expression
   * means the test survives a change of validation style, which the previous
   * source-text version of this did not.
   *
   * "99999999999999999999" is the interesting case: it is not a valid id, but
   * `Number.isInteger` says yes to it (1e20), which is why digits are checked on
   * the string instead. */
  for (const bad of ["evil'--", "99999999999999999999", "1e21", "", "-1", "1.5", " 5"]) {
    const { env, writes } = stubEnv();
    const tg = stubFetch();
    try {
      await handleUpdate(press(`qtag:${bad}:server`, GROUP), env);
    } finally {
      tg.restore();
    }
    const configWrites = writes.filter((w) => /INSERT INTO config/i.test(w.sql));
    assert.deepEqual(configWrites, [], `id ${JSON.stringify(bad)} wrote ${JSON.stringify(configWrites)}`);
  }

  // And the control: a well-formed id does write, so the test above is not
  // passing merely because nothing ever writes.
  const { env, writes } = stubEnv();
  const tg = stubFetch();
  try {
    await handleUpdate(press("qtag:5:server", GROUP), env);
  } finally {
    tg.restore();
  }
  const keys = writes.filter((w) => /INSERT INTO config/i.test(w.sql)).map((w) => w.binds[0]);
  assert.ok(keys.includes("qprod_5"), `a valid id wrote ${JSON.stringify(keys)}`);
});
