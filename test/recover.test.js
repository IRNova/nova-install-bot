/* /recover deletes a live Worker, so the tests are about what must survive it.
 *
 * The failure that matters is not "recovery did not work". It is "recovery
 * worked and the panel came back empty", which to the owner is indistinguishable
 * from losing every user they had. That failure is one wrong binding away: the
 * database id has to be carried across the delete by hand, because after a
 * delete there is nothing left to inherit from.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rebuildBindings, unrecoverableSecrets } from "../src/recover.js";

// What Cloudflare actually returns from /settings for a bot-built Nova panel:
// resource ids present, and the secret's VALUE absent.
const LIVE = [
  { type: "kv_namespace", name: "KV", namespace_id: "kv123" },
  { type: "secret_text", name: "NOVA_INSTALLATION_ID" },
  { type: "d1", name: "DB", database_id: "db456" },
];

test("the database is carried across the delete by id", () => {
  const out = rebuildBindings(LIVE, "nv1.fresh");
  const db = out.find((b) => b.name === "DB");
  assert.ok(db, "the DB binding was dropped, which brings the panel back empty");
  assert.equal(db.type, "d1");
  assert.equal(db.id, "db456");
  const kv = out.find((b) => b.name === "KV");
  assert.equal(kv.namespace_id, "kv123");
});

test("no binding is rebuilt as inherit", () => {
  /* "inherit" means "keep what the script already has". After a delete the
   * script has nothing, so an inherited binding is an absent one, and the panel
   * comes back with no database. This is the single most dangerous mistake
   * available in this file. */
  for (const b of rebuildBindings(LIVE, "nv1.fresh")) {
    assert.notEqual(b.type, "inherit", `${b.name} would inherit from a script that no longer exists`);
  }
});

test("the installation secret is reissued rather than copied", () => {
  // Its value is never returned by the API, so copying it would write undefined
  // into a name the worker trusts.
  const out = rebuildBindings(LIVE, "nv1.fresh");
  const secret = out.find((b) => b.name === "NOVA_INSTALLATION_ID");
  assert.equal(secret.type, "secret_text");
  assert.equal(secret.text, "nv1.fresh");
});

test("a secret we cannot read is dropped, not guessed, and is reported", () => {
  const withExtra = [...LIVE, { type: "secret_text", name: "MY_OWN_KEY" }];
  const out = rebuildBindings(withExtra, "nv1.fresh");
  const mine = out.find((b) => b.name === "MY_OWN_KEY");
  assert.equal(mine, undefined, "an unreadable secret was recreated with a wrong value");
  // Dropped silently is the bad version: the owner has to be told.
  assert.deepEqual(unrecoverableSecrets(withExtra), ["MY_OWN_KEY"]);
  assert.deepEqual(unrecoverableSecrets(LIVE), [], "Nova's own secret is not a loss, it is reissued");
});

test("bindings whose id arrives under the generic key still survive", () => {
  // Cloudflare is not consistent about `id` versus `database_id` across
  // endpoints, and reading the wrong one yields a binding with no target.
  const out = rebuildBindings([
    { type: "d1", name: "DB", id: "db789" },
    { type: "kv_namespace", name: "KV", id: "kv789" },
  ], "x");
  assert.equal(out.find((b) => b.name === "DB").id, "db789");
  assert.equal(out.find((b) => b.name === "KV").namespace_id, "kv789");
});

test("nothing is destroyed before the replacement is fully in hand", () => {
  /* Ordering is the whole safety design: between DELETE and PUT the user has no
   * panel, so the code download, the binding capture and the domain capture all
   * have to happen first. A validation failure discovered after the delete is a
   * panel that stays deleted. */
  const src = readFileSync(new URL("../src/recover.js", import.meta.url), "utf8");
  const at = (needle) => {
    const i = src.indexOf(needle);
    assert.ok(i > 0, `not found: ${needle}`);
    return i;
  };
  const del = at('cf("DELETE"');
  assert.ok(at("downloadWorkerCode") < del, "the code is downloaded after the delete");
  assert.ok(at("const before = bindingsOf(settings)") < del, "bindings are read after the delete");
  assert.ok(at("workerUpload(code") < del, "the upload is built after the delete");
  assert.ok(at("createInstallationFingerprint") < del, "the secret is minted after the delete");
});

test("a delete with no create tells the user their data is safe", () => {
  // The one moment this command can leave someone worse off. What they need
  // first is not an error code, it is to know the database was not touched.
  const src = readFileSync(new URL("../src/recover.js", import.meta.url), "utf8");
  assert.match(src, /rec_stranded/, "no message for the delete-succeeded-create-failed case");
  const en = readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
  assert.match(en, /rec_stranded:/);
});

test("recovery refuses to touch a Worker that is not a Nova panel", () => {
  const src = readFileSync(new URL("../src/recover.js", import.meta.url), "utf8");
  const del = src.indexOf('cf("DELETE"');
  const check = src.indexOf("if (!isNova(settings))");
  assert.ok(check > 0 && check < del, "the Nova check does not precede the delete");
  // And it refuses when the database id is missing, since recreating without it
  // produces a panel that looks like it lost all of its users.
  assert.match(src, /rec_no_db/);
});
