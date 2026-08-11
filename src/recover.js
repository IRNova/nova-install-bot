/* /recover: rebuild a panel whose Worker slot has wedged.
 *
 * A Cloudflare Worker slot can get into a state where every request answers
 * 1101 no matter what code is deployed to it. Re-uploading the same code does
 * not clear it, which is why /update cannot fix this and why users reasonably
 * conclude the panel is broken: it is, but not in a way anything they can see
 * explains. The only fix is to delete the script and create it again.
 *
 * The whole design here is about one window. Between DELETE and PUT the user
 * has no panel, so everything that can be done first IS done first: the code is
 * downloaded and validated, the bindings are captured, the custom domains are
 * captured. By the time anything is destroyed the only remaining step is a
 * create that has every input it needs already in hand.
 *
 * What survives, and why this is a recovery rather than a reinstall: the D1
 * database and KV namespace are never touched, so every user, subscription and
 * setting inside the panel is untouched. The Worker keeps its name, so the panel
 * URL and every subscription link already handed out keep working. What is lost
 * is the Worker script itself, which is the thing that was broken.
 */
import { send, edit, esc } from "./telegram.js";
import {
  cf, cfOk, cfErr, adminUrl, downloadWorkerCode, workerUpload,
  createInstallationFingerprint,
} from "./install.js";
import { t } from "./i18n.js";
import { discoverNovaWorkers, workerPicker, loadUpdCtx, clearUpdCtx } from "./update.js";

const STEP_KEYS = ["verify", "read", "fetch", "delete", "create", "enable", "online"];

/* Bindings come back from /settings with their resource ids but WITHOUT secret
 * values: a secret_text binding is returned as a name and a type only. That is
 * unrecoverable across a delete, so those are rebuilt rather than copied, and
 * NOVA_INSTALLATION_ID is the only one Nova creates.
 *
 * "inherit" is not an option here either. It means "keep what the script
 * already has", and after a delete the script has nothing, so every binding has
 * to be restated with its actual resource id. */
export function rebuildBindings(before, freshInstallationId) {
  const out = [];
  for (const b of before || []) {
    if (!b || !b.name) continue;
    if (b.type === "d1") out.push({ type: "d1", name: b.name, id: b.database_id || b.id });
    else if (b.type === "kv_namespace") out.push({ type: "kv_namespace", name: b.name, namespace_id: b.namespace_id || b.id });
    else if (b.type === "secret_text") {
      // The only secret Nova issues. Anything else the owner added by hand
      // cannot be read back, so it cannot be restored, and silently dropping it
      // is better than writing a wrong value into a name the code trusts.
      if (b.name === "NOVA_INSTALLATION_ID") {
        out.push({ type: "secret_text", name: b.name, text: freshInstallationId });
      }
    } else if (b.type === "plain_text") {
      out.push({ type: "plain_text", name: b.name, text: String(b.text || "") });
    }
  }
  return out;
}

/** Secrets we cannot carry across a delete, so the user can be told plainly. */
export function unrecoverableSecrets(before) {
  return (before || [])
    .filter((b) => b && b.type === "secret_text" && b.name !== "NOVA_INSTALLATION_ID")
    .map((b) => b.name);
}

function bindingsOf(res) {
  const r = res && res.json && res.json.result;
  return Array.isArray(r && r.bindings) ? r.bindings : [];
}

const isNova = (settings) => cfOk(settings) &&
  bindingsOf(settings).some((b) => b && b.type === "d1" && b.name === "DB");

/* Cloudflare does not always free a script name the instant the delete returns,
 * and creating into a name that is still going away is exactly the failure this
 * command must not have. Retry briefly rather than hand back a deleted panel. */
async function createWithRetry(account, name, token, upload, attempts = 4) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    last = await cf("PUT",
      `/accounts/${account}/workers/scripts/${encodeURIComponent(name)}`,
      token, upload.body, upload.contentType);
    if (cfOk(last)) return last;
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  return last;
}

async function isLive(url) {
  const r = await fetch(url, { redirect: "manual" }).catch(() => null);
  // Anything that is not the wedged-slot error means the slot is serving again.
  return !!r && r.status !== 1101 && r.status < 500;
}

/* The recovery itself. `worker` is {n: name, a: accountId, s: subdomain} from
 * the same discovery /update uses. */
export async function runRecover(env, chatId, msgId, worker, token, lang) {
  const state = {};
  const render = () => t(lang, "rec_run") + "\n\n" + STEP_KEYS.map((k) => {
    const s = state[k];
    const icon = s === "done" ? "✅" : s === "err" ? "❌" : s === "run" ? "⏳" : "▫️";
    return `${icon} ${t(lang, "rs_" + k)}`;
  }).join("\n");
  const paint = () => edit(env, chatId, msgId, render()).catch(() => {});
  const set = async (k, s) => { state[k] = s; await paint(); };
  const fail = async (k, message, extra = "") => {
    state[k] = "err";
    await paint();
    await send(env, chatId, `❌ ${esc(message)}${extra}`);
  };

  let deleted = false;
  try {
    await set("verify", "run");
    const settings = await cf("GET",
      `/accounts/${worker.a}/workers/scripts/${encodeURIComponent(worker.n)}/settings`, token);
    if (!isNova(settings)) return fail("verify", t(lang, "rec_not_nova"));
    await set("verify", "done");

    /* Read everything the rebuild needs while the worker still exists. After
     * the delete none of this is retrievable. */
    await set("read", "run");
    const before = bindingsOf(settings);
    if (!before.some((b) => b.type === "d1" && b.name === "DB" && (b.database_id || b.id))) {
      // Without the database id the panel would come back empty, which looks to
      // the user exactly like losing every one of their users.
      return fail("read", t(lang, "rec_no_db"));
    }
    const domains = await cf("GET",
      `/accounts/${worker.a}/workers/domains?service=${encodeURIComponent(worker.n)}`, token)
      .catch(() => null);
    const customDomains = ((domains && cfOk(domains) && domains.json.result) || [])
      .filter((d) => d && d.hostname && d.zone_id);
    const lostSecrets = unrecoverableSecrets(before);
    await set("read", "done");

    // Validated BEFORE anything is destroyed: a bad artifact must never be
    // discovered in the window where the user has no panel.
    await set("fetch", "run");
    let code;
    try { code = await downloadWorkerCode(env); }
    catch (e) { return fail("fetch", (e && e.message) || "Could not download a verified Nova worker."); }
    await set("fetch", "done");

    const fingerprint = await createInstallationFingerprint(env, worker.a, worker.n);
    const upload = workerUpload(code, {
      main_module: "worker.js",
      compatibility_date: "2026-07-30",
      compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
      bindings: rebuildBindings(before, fingerprint),
    }, "novarecover");

    await set("delete", "run");
    const del = await cf("DELETE",
      `/accounts/${worker.a}/workers/scripts/${encodeURIComponent(worker.n)}?force=true`, token);
    // A script that is already gone is not an error here: it is the state we
    // were trying to reach.
    if (!cfOk(del) && del.status !== 404) return fail("delete", cfErr(del));
    deleted = true;
    await set("delete", "done");

    await set("create", "run");
    const made = await createWithRetry(worker.a, worker.n, token, upload);
    if (!cfOk(made)) {
      return fail("create", cfErr(made), `\n\n${t(lang, "rec_stranded")}`);
    }
    deleted = false;
    await set("create", "done");

    await set("enable", "run");
    await cf("POST",
      `/accounts/${worker.a}/workers/scripts/${encodeURIComponent(worker.n)}/subdomain`,
      token, JSON.stringify({ enabled: true }), "application/json").catch(() => {});
    // Custom domains are attached to the script, so a delete detaches them.
    // Re-attaching is what keeps a panel on its own domain reachable.
    for (const d of customDomains) {
      await cf("PUT", `/accounts/${worker.a}/workers/domains`, token, JSON.stringify({
        environment: "production", hostname: d.hostname, service: worker.n, zone_id: d.zone_id,
      }), "application/json").catch(() => {});
    }
    await set("enable", "done");

    await set("online", "run");
    const url = worker.s ? `https://${worker.n}.${worker.s}.workers.dev` : "";
    let online = false;
    for (let i = 0; i < 6 && url; i++) {
      if (await isLive(url)) { online = true; break; }
      await new Promise((r) => setTimeout(r, 2000));
    }
    await set("online", online ? "done" : "err");

    let note = "";
    if (customDomains.length) note += `\n\n${t(lang, "rec_domains", customDomains.length)}`;
    if (lostSecrets.length) note += `\n\n${t(lang, "rec_lost_secrets", esc(lostSecrets.join(", ")))}`;
    if (!online) note += `\n\n${t(lang, "rec_slow")}`;

    return send(env, chatId, t(lang, "rec_done", esc(worker.n)) + note, url ? {
      reply_markup: { inline_keyboard: [[{
        text: t(lang, "btn_open_panel"), url: adminUrl(url), style: "primary",
      }]] },
    } : {});
  } catch (error) {
    const extra = deleted ? `\n\n${t(lang, "rec_stranded")}` : "";
    return fail("create", (error && error.message) || "unknown error", extra);
  } finally {
    token = "";
  }
}

/* Entry point: the user has just pasted a token for a recovery.
 *
 * Same discovery and same encrypted, 10-minute token session as /update, since
 * the question ("which of your Nova panels?") is identical. Only the buttons
 * differ, and they lead to a confirmation rather than straight to the work:
 * this deletes something, so the user sees exactly what and agrees first. */
export async function startRecover(env, chatId, token, userId, lang) {
  const found = await discoverNovaWorkers(env, chatId, token, userId, lang);
  if (!found) return;
  const pick = workerPicker(found, "recp", lang, t(lang, "rec_pick"));
  return send(env, chatId, pick.text, pick.extra);
}

/** The confirmation. Names the panel, and says plainly what is kept and lost. */
export async function confirmRecover(env, chatId, msgId, userId, idx, lang) {
  const ctx = await loadUpdCtx(env, userId);
  const worker = ctx && ctx.w[idx];
  if (!worker) return edit(env, chatId, msgId, t(lang, "upd_expired"));
  return edit(env, chatId, msgId, t(lang, "rec_confirm", esc(worker.n)), {
    reply_markup: { inline_keyboard: [
      [{ text: t(lang, "btn_rec_go"), callback_data: `recgo:${idx}`, style: "danger" }],
      [{ text: t(lang, "btn_upd_cancel"), callback_data: "updx" }],
    ] },
  });
}

/** Confirmed: load the one-time token, spend it, and rebuild. */
export async function doRecover(env, chatId, msgId, userId, idx, lang) {
  const ctx = await loadUpdCtx(env, userId);
  const worker = ctx && ctx.w[idx];
  if (!worker) return edit(env, chatId, msgId, t(lang, "upd_expired"));
  // Spend the session before the work, not after: a token that outlives its use
  // is a token that can be replayed if anything below throws.
  await clearUpdCtx(env, userId);
  await edit(env, chatId, msgId, t(lang, "rec_run")).catch(() => {});
  return runRecover(env, chatId, msgId, worker, ctx.t, lang);
}
