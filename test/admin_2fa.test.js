import test from "node:test";
import assert from "node:assert/strict";
import {
  startChallenge, verifyChallenge, getPanelAdminIds, setPanelAdminIds,
  isLockedOut, noteLoginFailure, clearLoginFailures,
} from "../src/admin_2fa.js";

// Minimal in-memory stand-in for the config table plus Telegram delivery.
function makeEnv({ admins = "", deliver = true } = {}) {
  const cfg = new Map();
  if (admins) cfg.set("panel_admin_ids", admins);
  const sent = [];
  const env = {
    ADMIN_PASSWORD: "pw",
    BOT_TOKEN: "t",
    sent,
    DB: {
      prepare(sql) {
        return {
          bind(...a) { return this; },
          async run() {
            if (/^DELETE FROM config WHERE key LIKE/.test(sql)) return {};
            return {};
          },
          async first() { return null; },
        };
      },
    },
  };
  // getConfig/setConfig/delConfig in db.js go through env.DB; intercept them by
  // swapping the prepare() implementation for one backed by the Map.
  env.DB.prepare = (sql) => ({
    _b: [],
    bind(...a) { this._b = a; return this; },
    async first() {
      if (/SELECT value FROM config WHERE key/.test(sql)) {
        const v = cfg.get(this._b[0]);
        return v == null ? null : { value: v };
      }
      return null;
    },
    async run() {
      if (/INSERT INTO config/.test(sql)) cfg.set(this._b[0], this._b[1]);
      else if (/DELETE FROM config WHERE key = /.test(sql)) cfg.delete(this._b[0]);
      return {};
    },
  });
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push(body);
    return { json: async () => ({ ok: deliver }) };
  };
  return env;
}

function codeFrom(env) {
  const m = env.sent.at(-1).text.match(/<code>(\d{6})<\/code>/);
  return m && m[1];
}

test("no allowlist means no challenge, so the panel stays locked", async () => {
  const env = makeEnv({ admins: "" });
  assert.equal(await startChallenge(env), null);
});

test("allowlist parsing ignores junk and de-duplicates", async () => {
  const env = makeEnv();
  const ids = await setPanelAdminIds(env, "870643719, abc, 870643719  123");
  assert.deepEqual(ids, ["870643719", "870643719", "123"]);
  assert.deepEqual(await getPanelAdminIds(env), ["870643719", "123"]);
});

test("correct code authenticates exactly once", async () => {
  const env = makeEnv({ admins: "111" });
  const ch = await startChallenge(env, { ip: "1.2.3.4" });
  assert.equal(ch.delivered, 1);
  const code = codeFrom(env);
  assert.match(code, /^\d{6}$/);
  assert.equal((await verifyChallenge(env, ch.challengeId, code)).ok, true);
  // Replay of the same code must fail: challenges are single use.
  assert.equal((await verifyChallenge(env, ch.challengeId, code)).ok, false);
});

test("wrong code is rejected and the challenge burns after 5 tries", async () => {
  const env = makeEnv({ admins: "111" });
  const ch = await startChallenge(env);
  const code = codeFrom(env);
  const wrong = code === "000000" ? "111111" : "000000";
  for (let i = 0; i < 4; i++) {
    const r = await verifyChallenge(env, ch.challengeId, wrong);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "wrong");
  }
  const last = await verifyChallenge(env, ch.challengeId, wrong);
  assert.equal(last.reason, "burned");
  // Even the real code is useless once the challenge is burned.
  assert.equal((await verifyChallenge(env, ch.challengeId, code)).ok, false);
});

test("a code is not valid against a different challenge id", async () => {
  const env = makeEnv({ admins: "111" });
  const a = await startChallenge(env); const ca = codeFrom(env);
  const b = await startChallenge(env);
  assert.equal((await verifyChallenge(env, b.challengeId, ca)).ok, false);
});

test("malformed input never authenticates", async () => {
  const env = makeEnv({ admins: "111" });
  const ch = await startChallenge(env);
  for (const bad of ["", "12345", "1234567", "abcdef", null, undefined]) {
    assert.equal((await verifyChallenge(env, ch.challengeId, bad)).ok, false);
  }
  for (const badId of ["", "nope", "../../x", null]) {
    assert.equal((await verifyChallenge(env, badId, "123456")).ok, false);
  }
});

test("undeliverable code burns the challenge instead of leaving it open", async () => {
  const env = makeEnv({ admins: "111", deliver: false });
  const ch = await startChallenge(env);
  assert.equal(ch.challengeId, null);
  assert.equal(ch.delivered, 0);
});

test("the plaintext code is never stored", async () => {
  const env = makeEnv({ admins: "111" });
  const ch = await startChallenge(env);
  const code = codeFrom(env);
  const stored = await env.DB.prepare("SELECT value FROM config WHERE key = ?")
    .bind("twofa_" + ch.challengeId).first();
  assert.ok(stored.value.length > 0);
  assert.equal(stored.value.includes(code), false);
});

test("repeated password failures lock the source IP out", async () => {
  const env = makeEnv({ admins: "111" });
  assert.equal(await isLockedOut(env, "9.9.9.9"), false);
  for (let i = 0; i < 8; i++) await noteLoginFailure(env, "9.9.9.9");
  assert.equal(await isLockedOut(env, "9.9.9.9"), true);
  // A different IP is unaffected, and a success clears the counter.
  assert.equal(await isLockedOut(env, "8.8.8.8"), false);
  await clearLoginFailures(env, "9.9.9.9");
  assert.equal(await isLockedOut(env, "9.9.9.9"), false);
});
