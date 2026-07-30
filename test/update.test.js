import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  startUpdate, loadUpdCtx, runUpdate,
} from "../src/update.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function fakeDb() {
  let row = null;
  return {
    get row() { return row; },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.includes("INSERT INTO update_sessions")) {
                row = {
                  user_id: args[0],
                  chat_id: args[1],
                  token_cipher: args[2],
                  token_iv: args[3],
                  workers_json: args[4],
                  expires_at: args[5],
                };
              } else if (sql.includes("DELETE FROM update_sessions")) {
                row = null;
              }
              return { success: true };
            },
            async first() { return row; },
          };
        },
      };
    },
  };
}

function json(result) {
  return new Response(JSON.stringify({ success: true, result }), {
    headers: { "Content-Type": "application/json" },
  });
}

test("update token is encrypted and bindings are inherited", async () => {
  const originalFetch = globalThis.fetch;
  const db = fakeDb();
  const env = {
    BOT_TOKEN: "123456789:high-entropy-telegram-secret-for-tests",
    DB: db,
    WORKER_JS_URL: "https://raw.githubusercontent.com/IRNova/Nova-Proxy/main/worker.js",
  };
  const token = "cfut_" + "A".repeat(60);
  const bindings = [
    { type: "d1", name: "DB", database_id: "db-123" },
    { type: "kv_namespace", name: "KV", namespace_id: "kv-123" },
  ];
  let uploaded = "";

  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    if (target.startsWith("https://api.telegram.org/")) return json({ message_id: 10 });
    if (target === env.WORKER_JS_URL) {
      const markers =
        "const Version = 'test';const NOVA_BUILD='test';" +
        "const NOVA_TG_CHANNEL='test';export default {};";
      return new Response(markers + "x".repeat(100_000));
    }
    if (target.endsWith("/user/tokens/verify")) return json({ status: "active" });
    if (target.includes("/accounts?")) return json([{ id: "acct-1", name: "Personal" }]);
    if (target.endsWith("/workers/scripts?per_page=100")) return json([{ id: "nova-test" }]);
    if (target.endsWith("/workers/subdomain")) return json({ subdomain: "example" });
    if (target.endsWith("/settings")) return json({ bindings });
    if (target.endsWith("/content") && init.method === "PUT") {
      uploaded = await init.body.text();
      return json({ id: "nova-test" });
    }
    throw new Error(`unexpected fetch: ${init.method || "GET"} ${target}`);
  };

  try {
    await startUpdate(env, 7, token, 42, "en");
    assert.ok(db.row);
    assert.equal(db.row.token_cipher.includes(token), false);
    assert.equal(db.row.workers_json.includes(token), false);

    const session = await loadUpdCtx(env, 42);
    assert.equal(session.t, token);
    assert.equal(session.w[0].n, "nova-test");

    await runUpdate(env, 7, 10, 42, 0, "en");
    assert.equal(db.row, null);
    assert.match(uploaded, /"type":"inherit","name":"DB"/);
    assert.match(uploaded, /"type":"inherit","name":"KV"/);
    assert.equal(uploaded.includes(token), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
