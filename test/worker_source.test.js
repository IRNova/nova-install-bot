/* The worker.js this bot installs and updates has to be downloadable.
 *
 * It was pointed at `IRNova/Nova-Release`, which no longer exists, so BOTH the
 * primary and the fallback 404'd and every install and update failed with
 * "Could not download a verified Nova worker (HTTP 404)". Nothing in the repo
 * noticed, because the url lives in config and is only ever exercised against
 * the network by a real user pressing Update.
 *
 * The two checks that hit the network are OPT-IN, via NOVA_CHECK_NET=1. They
 * are deliberately not part of `npm test`: a suite that reaches the internet is
 * a suite that fails on a train, and `fetch` keeps its socket alive so the test
 * runner hangs after they pass. Run them before a release, and in CI on a
 * schedule:
 *
 *   NOVA_CHECK_NET=1 npm test
 *
 * The configured-ness check below always runs, because that catches an empty or
 * misspelled variable without touching the network.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cfg = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const urlFor = (key) => (new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`).exec(cfg) || [])[1];
const URLS = ["WORKER_JS_URL", "WORKER_JS_FALLBACK_URL"].map((k) => [k, urlFor(k)]);
const skip = process.env.NOVA_CHECK_NET !== "1";

test("both worker sources are configured", () => {
  for (const [key, url] of URLS) assert.ok(url, `${key} is not set`);
});

test("neither source redirects", { skip }, async () => {
  /* `downloadWorkerCode` fetches with `redirect: "manual"`, so a 302 is read as
   * a failure rather than followed. That rules out
   * `/releases/latest/download/worker.js`, which is the obvious thing to reach
   * for and would fail only in production. */
  for (const [key, url] of URLS) {
    const r = await fetch(url, { redirect: "manual" });
    assert.equal(r.status, 200, `${key} answered ${r.status}, and the downloader does not follow redirects`);
  }
});

test("both sources pass the same integrity check the installer applies", { skip }, async () => {
  for (const [key, url] of URLS) {
    const code = await (await fetch(url, { redirect: "manual" })).text();
    // Kept identical to validWorkerCode() in src/install.js.
    for (const needle of ["const Version =", "NOVA_BUILD", "NOVA_TG_CHANNEL"]) {
      assert.ok(code.includes(needle), `${key}: downloaded worker is missing ${needle}`);
    }
    assert.ok(code.length > 100_000, `${key}: worker looks truncated (${code.length} bytes)`);
  }
});
