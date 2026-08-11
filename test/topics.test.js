/* Routing cards into per-product topics.
 *
 * The thing most likely to go wrong here is not the routing, it is the caching
 * of "this group is not a forum". Turning Topics on is a setting the owner
 * changes by hand, hours or days after the bot last checked. Cache that "no"
 * permanently and the owner follows the instructions, sees nothing change, and
 * concludes the feature does not work; there is no error anywhere to tell them
 * otherwise.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { productThread, TOPICS } from "../src/topics.js";

function env(config = {}, chat = { ok: true, result: { is_forum: false } }) {
  const store = new Map(Object.entries(config));
  const calls = [];
  const e = {
    BOT_TOKEN: "t:t",
    DB: {
      prepare: (sql) => ({
        bind: (...b) => ({
          first: async () => (store.has(b[0]) ? { value: store.get(b[0]) } : null),
          run: async () => { if (/INSERT INTO config/i.test(sql)) store.set(b[0], String(b[1])); },
          all: async () => ({ results: [] }),
        }),
        first: async () => null, run: async () => {}, all: async () => ({ results: [] }),
      }),
    },
  };
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const method = String(url).split("/").pop();
    calls.push(method);
    if (method === "getChat") return { ok: true, json: async () => chat };
    if (method === "createForumTopic") {
      return { ok: true, json: async () => ({ ok: true, result: { message_thread_id: 42 } }) };
    }
    return { ok: true, json: async () => ({ ok: true, result: {} }) };
  };
  return { e, store, calls, restore: () => { globalThis.fetch = real; } };
}

test("a group without Topics posts to the group, not a thread", async () => {
  const h = env();
  try {
    assert.equal(await productThread(h.e, "-100", "server"), null);
  } finally { h.restore(); }
});

test("a stale 'not a forum' is re-checked, so turning Topics on takes effect", async () => {
  /* The bug this exists for: with a permanent "0" the owner enables Topics and
   * absolutely nothing happens, forever, with no error to explain it. */
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const h = env({ admin_forum: `0:${twoHoursAgo}` }, { ok: true, result: { is_forum: true } });
  try {
    assert.equal(await productThread(h.e, "-100", "server"), 42, "a stale no was never re-checked");
  } finally { h.restore(); }
  assert.ok(h.calls.includes("getChat"), "the forum state was taken from cache without asking");
  assert.equal(h.store.get("admin_forum"), "1");
});

test("a fresh 'not a forum' is not re-checked on every message", async () => {
  const h = env({ admin_forum: `0:${Date.now()}` }, { ok: true, result: { is_forum: true } });
  try {
    assert.equal(await productThread(h.e, "-100", "server"), null);
  } finally { h.restore(); }
  assert.ok(!h.calls.includes("getChat"), "asked Telegram again inside the cache window");
});

test("a created topic is remembered, and the two products do not share one", async () => {
  const h = env({ admin_forum: "1" }, { ok: true, result: { is_forum: true } });
  try {
    assert.equal(await productThread(h.e, "-100", "proxy"), 42);
  } finally { h.restore(); }
  assert.equal(h.store.get(TOPICS.proxy.key), "42");
  assert.equal(h.store.get(TOPICS.server.key), undefined, "both products wrote the same topic key");
});

test("an unknown product never routes anywhere", async () => {
  const h = env({ admin_forum: "1" });
  try {
    assert.equal(await productThread(h.e, "-100", "nonsense"), null);
  } finally { h.restore(); }
});
