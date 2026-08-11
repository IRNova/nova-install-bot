/* The support card in the admin group: its buttons and its product tag.
 *
 * These four buttons (Reply, Block, Close, Suggestion) existed, then a deploy
 * from a repo that had never held the newer source shipped a two-button card
 * over the top of them. Nothing failed, because nothing tested the shape of the
 * keyboard. This does.
 *
 * The tag is INFERRED, so the thing worth pinning down is not that the guess is
 * right (it cannot always be) but that a wrong guess is always one tap from
 * being corrected, and that the correction button says what it will do.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { contactKb, inferProduct, PRODUCTS } from "../src/bot.js";
import { readFileSync } from "node:fs";

const labels = (kb) => kb.inline_keyboard.flat().map((b) => b.text);
const datas = (kb) => kb.inline_keyboard.flat().map((b) => b.callback_data);

/* A stand-in for D1 that answers `getConfig` from a plain object, so the flow
 * signal can be tested without a database. */
const envWith = (config = {}) => ({
  DB: {
    prepare: () => ({
      bind: (key) => ({
        first: async () => (key in config ? { value: config[key] } : null),
      }),
    }),
  },
});

test("a card carries Reply, Block, Close and Suggestion", () => {
  const kb = contactKb(42, false, false, null, 7, "proxy");
  const text = labels(kb).join(" | ");
  for (const want of ["Reply", "Block", "Close", "Suggestion"]) {
    assert.ok(text.includes(want), `the card lost its ${want} button: ${text}`);
  }
  assert.ok(datas(kb).includes("qclose:7"));
  assert.ok(datas(kb).includes("qsugg:7"));
});

test("every label is bilingual", () => {
  // The admin group reads both. A card in one language is a card half the
  // people acting on it have to decode.
  const kb = contactKb(42, false, false, null, 7, "proxy");
  for (const label of labels(kb)) {
    if (label.startsWith("↔")) continue; // the tag toggle names two products
    assert.ok(label.includes("/"), `not bilingual: ${label}`);
  }
});

test("without a qa id the card degrades to Reply and Block", () => {
  // Close and Suggestion write to a qa_log row. With no row to write to, the
  // buttons would answer with an error, so they are not offered.
  const kb = contactKb(42, false, false);
  const d = datas(kb).join(" ");
  assert.ok(!d.includes("qclose:"), "offered Close with nothing to close");
  assert.ok(!d.includes("qsugg:"));
});

test("the tag toggle offers the OTHER product", () => {
  const proxy = contactKb(1, false, false, null, 9, "proxy");
  const server = contactKb(1, false, false, null, 9, "server");
  assert.ok(datas(proxy).includes("qtag:9:server"), "a Proxy card must flip to Server");
  assert.ok(datas(server).includes("qtag:9:proxy"), "a Server card must flip to Proxy");
  // The label has to name the destination, or an admin cannot tell whether they
  // are reading the current tag or the button's effect.
  const toggle = labels(proxy).find((l) => l.startsWith("↔"));
  assert.ok(toggle.includes(PRODUCTS.server.tag), `toggle does not name its target: ${toggle}`);
});

test("the flow the user came from decides the tag", async () => {
  // The strongest signal, and the reason the tag is worth having: someone who
  // just pressed "Nova on your own VPS" is asking about the server even if
  // their message says nothing identifying at all.
  assert.equal(await inferProduct(envWith({ flow_5: "server" }), 5, "سلام مشکل دارم"), "server");
  assert.equal(await inferProduct(envWith({ flow_5: "proxy" }), 5, "vps ssh root"), "proxy");
});

test("wording decides it when there is no flow to go on", async () => {
  const env = envWith();
  assert.equal(await inferProduct(env, 5, "my vps wont start after reboot"), "server");
  assert.equal(await inferProduct(env, 5, "روی سرور نصب نمیشه"), "server");
  assert.equal(await inferProduct(env, 5, "cloudflare token is rejected"), "proxy");
  // Ambiguous and empty messages both land on the default rather than guessing:
  // a coin-flip tag is worse than a predictable one, because the admin stops
  // trusting the tag at all.
  assert.equal(await inferProduct(env, 5, "my vps cannot reach cloudflare"), "proxy");
  assert.equal(await inferProduct(env, 5, ""), "proxy");
});

test("the word list does not fire on ordinary support prose", async () => {
  const env = envWith();
  for (const said of ["سلام", "hi, it stopped working", "چطور پسورد را عوض کنم؟"]) {
    assert.equal(await inferProduct(env, 5, said), "proxy", `misread: ${said}`);
  }
});

/* Closing has to actually close.
 *
 * The Waiting inbox selects rows with no `answer`. A close that only writes
 * `source` leaves the question sitting in the queue looking unanswered, which is
 * the exact thing an admin pressed Close to stop. The 244 rows already in the
 * database carry a sentinel answer, and this pins those strings: change them and
 * the old closures and the new ones stop being one set.
 */
test("closing writes the sentinel answer that clears the Waiting queue", async () => {
  const { setQaSource, QA_MARK } = await import("../src/db.js");
  const seen = [];
  const env = { DB: { prepare: (sql) => ({ bind: (...a) => ({ run: async () => seen.push({ sql, a }) }) }) } };

  await setQaSource(env, 12, "closed");
  assert.equal(seen.length, 1);
  assert.match(seen[0].sql, /SET source = \?/);
  assert.match(seen[0].sql, /answer = CASE WHEN answer IS NULL OR answer = ''/,
    "close must set an answer, or the question never leaves the Waiting inbox");
  assert.deepEqual(seen[0].a, ["closed", QA_MARK.closed, 12]);
  // Byte-for-byte with what is already stored.
  assert.equal(QA_MARK.closed, "🚫 Closed / بسته‌شده");
  assert.equal(QA_MARK.suggestion, "💡 Suggestion / پیشنهاد");
});

test("a real reply is never overwritten by a sentinel", async () => {
  // Closing a question someone already answered must not replace the reply the
  // user was sent. That is why the UPDATE is a CASE and not an assignment.
  const { setQaSource } = await import("../src/db.js");
  let sql = "";
  const env = { DB: { prepare: (s) => { sql = s; return { bind: () => ({ run: async () => {} }) }; } } };
  await setQaSource(env, 12, "suggestion");
  assert.ok(!/answer = \?[,\s]/.test(sql), "sentinel is assigned unconditionally");
  assert.match(sql, /ELSE answer END/);
});

test("the FAQ drafter is not fed closed questions", async () => {
  // 198 closed rows carry "🚫 Closed / بسته‌شده" as their answer. Unfiltered,
  // the drafter reads those as the answers and writes an FAQ of closures.
  const { readFileSync } = await import("node:fs");
  const ai = readFileSync(new URL("../src/ai.js", import.meta.url), "utf8");
  const calls = [...ai.matchAll(/listAnsweredQa\(env,\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(calls.length >= 2);
  for (const c of calls) {
    assert.match(c, /sources:/, `listAnsweredQa without a source filter reads sentinels: {${c}}`);
  }
});

/* The gate, not the keyboard.
 *
 * Everything above tests how a card is BUILT, and all of it passed while the
 * three new callback branches sat above the admin-group check: any of the 26k
 * users could press `qclose:` on a message in their own private chat and close
 * every open support question. Building the right buttons is not the same as
 * only honouring them from the right chat, and only the second one is security.
 */
test("card actions are refused outside the admin group", async () => {
  const src = readFileSync(new URL("../src/bot.js", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("async function handleCallback"));

  const gate = /String\(chatId\) !== String\(group\)/.exec(fn);
  assert.ok(gate, "handleCallback has no admin-group check at all");

  // Every card action must be named in the hoisted gate, and the gate must come
  // before the first branch that acts on one.
  const guarded = /\^\(([a-z|]+)\):/.exec(fn);
  assert.ok(guarded, "no hoisted prefix gate found");
  const covered = guarded[1].split("|");
  for (const action of ["reply", "dok", "qclose", "qsugg", "qtag", "ban", "unban"]) {
    assert.ok(covered.includes(action), `${action}: is not covered by the group gate`);
  }
  const firstAction = fn.indexOf('data.startsWith("reply:")');
  assert.ok(gate.index < firstAction, "the gate runs after a branch that already acted");
});

test("a qa id is validated before it becomes a config key", () => {
  // `qprod_${id}` with an unchecked id lets one press write one arbitrary row.
  const src = readFileSync(new URL("../src/bot.js", import.meta.url), "utf8");
  for (const branch of ["qtag:", "qclose:"]) {
    const at = src.indexOf(`data.startsWith("${branch}")`);
    const body = src.slice(at, at + 700);
    assert.match(body, /Number\.isInteger\(/, `${branch} does not integer-check its id`);
  }
});
