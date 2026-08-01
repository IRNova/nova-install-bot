import test from "node:test";
import assert from "node:assert/strict";
import {
  startChallenge, verifyChallenge, getPanelAdminIds, setPanelAdminIds,
  isLockedOut, noteLoginFailure, clearLoginFailures,
  getSessionKey, rotateSessionKey,
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

function codeFrom(env, idx = -1) {
  const m = env.sent.at(idx).text.match(/<code>(\d{6})<\/code>/);
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

test("session key is random, persisted, and not the admin password", async () => {
  const env = makeEnv({ admins: "111" });
  const k1 = await getSessionKey(env);
  assert.match(k1, /^[0-9a-f]{64}$/);
  assert.notEqual(k1, env.ADMIN_PASSWORD);
  assert.equal(await getSessionKey(env), k1); // stable across reads
  const k2 = await rotateSessionKey(env);
  assert.notEqual(k2, k1);
  assert.equal(await getSessionKey(env), k2);
});

test("two admins get different codes, and the code identifies who approved", async () => {
  const env = makeEnv({ admins: "111,222" });
  const ch = await startChallenge(env);
  assert.equal(ch.delivered, 2);
  const codeA = codeFrom(env, -2); // sent to 111
  const codeB = codeFrom(env, -1); // sent to 222
  assert.notEqual(codeA, codeB);
  const r = await verifyChallenge(env, ch.challengeId, codeB);
  assert.equal(r.ok, true);
  assert.equal(r.adminId, "222");
});

test("one admin's code still works when several were issued", async () => {
  const env = makeEnv({ admins: "111,222" });
  const ch = await startChallenge(env);
  const r = await verifyChallenge(env, ch.challengeId, codeFrom(env, -2));
  assert.equal(r.ok, true);
  assert.equal(r.adminId, "111");
});

// The regression that motivated the session key: the old cookie was
// ts + "." + HMAC(ADMIN_PASSWORD, ts), so anyone holding the password could
// mint a session offline and never touch the Telegram second factor.
test("knowing ADMIN_PASSWORD does not let you forge a session", async () => {
  const { makeToken, validToken } = await import("../src/admin.js");
  const env = makeEnv({ admins: "111" });

  const real = await makeToken(env, "111");
  assert.equal(await validToken(env, real), true);

  // Reproduce the old scheme using only the password an attacker would know.
  async function legacyForge(password, adminId) {
    const ts = Date.now().toString();
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigTs = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ts));
    const sigNew = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${adminId}`));
    const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
    return [`${ts}.${hex(sigTs)}`, `${ts}.${adminId}.${hex(sigNew)}`];
  }
  for (const forged of await legacyForge(env.ADMIN_PASSWORD, "111")) {
    assert.equal(await validToken(env, forged), false);
  }
});

test("removing an admin immediately invalidates their live session", async () => {
  const { makeToken, validToken } = await import("../src/admin.js");
  const env = makeEnv({ admins: "111,222" });
  const t222 = await makeToken(env, "222");
  assert.equal(await validToken(env, t222), true);
  await setPanelAdminIds(env, "111");
  assert.equal(await validToken(env, t222), false);
});

test("rotating the session key logs everyone out", async () => {
  const { makeToken, validToken } = await import("../src/admin.js");
  const env = makeEnv({ admins: "111" });
  const tok = await makeToken(env, "111");
  assert.equal(await validToken(env, tok), true);
  await rotateSessionKey(env);
  assert.equal(await validToken(env, tok), false);
});
