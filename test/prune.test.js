/* The nightly prune runs DELETE against the production database unattended, so
 * the thing worth testing is not what it removes but what it must never touch.
 *
 * A deleted live membership row is not a disaster (the gate re-checks), but a
 * deleted live `gadmin` row silently removes an admin's exemption, and a pattern
 * that over-matches would reach settings keys that are the bot's actual config.
 * None of that would be noticed by anyone until it caused something else.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HAS_SQLITE = (() => {
  try { execFileSync("sqlite3", ["--version"], { stdio: "ignore" }); return true; }
  catch { return false; }
})();

/* Pull the real SQL out of db.js rather than restating it, so this tests the
 * statements that actually ship. */
function statements() {
  const src = readFileSync(new URL("../src/db.js", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function pruneProductHints"));
  const out = [];
  for (const m of fn.matchAll(/env\.DB\.prepare\(\s*([\s\S]*?)\)\s*(?:\.bind\([\s\S]*?\))?\s*\.run\(\)/g)) {
    // The SQL is written as concatenated string literals; rebuild it.
    const sql = [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)]
      .map((s) => s[1].replace(/\\\\/g, "\\").replace(/\\"/g, '"')).join("");
    if (sql.trim().startsWith("DELETE")) out.push({ sql });
  }
  return out;
}

test("the prune keeps every row it must not delete", { skip: !HAS_SQLITE && "sqlite3 not installed" }, () => {
  const db = join(mkdtempSync(join(tmpdir(), "nova-prune-")), "t.db");
  const now = Date.now();
  const old = now - 48 * 60 * 60 * 1000;
  const run = (sql) => execFileSync("sqlite3", [db, sql], { encoding: "utf8" });

  // The tag statements join qa_log and users, so those have to exist. Empty is
  // the interesting case anyway: nothing to match means nothing may be deleted.
  run("CREATE TABLE config (key TEXT PRIMARY KEY, value TEXT);" +
      "CREATE TABLE qa_log (id INTEGER PRIMARY KEY, answer TEXT, answered_at TEXT);" +
      "CREATE TABLE users (id INTEGER PRIMARY KEY, last_seen TEXT);");
  const rows = [
    // MUST SURVIVE
    ["member_1", String(now), "a live confirmed membership"],
    ["gadmin_-100_1", String(now), "a live admin exemption"],
    ["contact_group_id", "-100123", "a real setting"],
    ["join_channel", "irnova_proxy", "a real setting"],
    ["admin_pass", "hunter2", "a real setting"],
    /* These exist to catch a missing ESCAPE clause. Without it the `_` in each
     * pattern is a single-character wildcard, so `member_%` also matches
     * `memberships` and `gadmin_%` matches `gadminX_1`. Each decoy is given the
     * exact value shape that the corresponding statement deletes, so an
     * over-matching pattern removes it and the test says so. */
    ["awaiting", "", "a key that only looks like await_"],
    ["memberships", "", "a key that only looks like member_"],
    ["gadminX_1", "", "a key that only looks like gadmin_"],
    ["memberX9", "!" + old, "a stale-shaped key that only looks like member_"],
    ["gate_dmX", String(old), "a key that only looks like gate_dm_"],
    ["gate_dm_x", String(now), "a fresh throttle stamp"],
    // MUST GO
    ["await_token_9", "", "a cleared await flag"],
    ["member_2", "", "a cleared membership row"],
    ["member_3", "!" + old, "a stale refusal"],
    ["gadmin_-100_9", "!" + old, "a stale admin miss"],
    ["gate_note_9", String(old), "a stale group notice stamp"],
    ["banned_note_9", String(old), "a stale banned notice stamp"],
  ];
  for (const [k, v] of rows) {
    run(`INSERT INTO config VALUES ('${k}', '${v.replace(/'/g, "''")}');`);
  }

  const stmts = statements();
  assert.ok(stmts.length >= 3, `expected the prune's DELETEs, found ${stmts.length}`);
  // The only bound parameter in these statements is the 24h cutoff. Left as a
  // bare "?" the sqlite3 CLI binds NULL, every comparison goes NULL, nothing is
  // deleted, and the test passes for the wrong reason.
  const cutoff = String(now - 24 * 60 * 60 * 1000);
  for (const { sql } of stmts) run(sql.replace(/\?/g, cutoff));

  const left = new Set(run("SELECT key FROM config;").trim().split("\n").filter(Boolean));
  const mustSurvive = rows.slice(0, 11), mustGo = rows.slice(11);
  for (const [k, , why] of mustSurvive) {
    assert.ok(left.has(k), `the prune deleted ${why} (${k})`);
  }
  for (const [k, , why] of mustGo) {
    assert.ok(!left.has(k), `the prune left ${why} (${k})`);
  }
});
