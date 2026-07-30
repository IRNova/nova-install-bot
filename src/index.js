// Nova Install Bot, entry point.
//
// Two surfaces on one Worker:
//   • /webhook , Telegram updates (install flow, menu, FAQ, contact)
//   • /admin   , password-protected web panel to manage content + broadcast
//
// Secrets (wrangler secret put, never committed):
//   BOT_TOKEN, WEBHOOK_SECRET, ADMIN_PASSWORD

import { handleUpdate, sweepCommunityGroup, syncBotProfile } from "./bot.js";
import { handleAdmin } from "./admin.js";
import { BANNER_JPEG_B64 } from "./banner.js";
import { autoAnswer } from "./ai.js";
import { pruneExpiredUpdateSessions } from "./update.js";

// Constant-time string compare, so matching a secret doesn't leak its length/prefix
// through response timing. Length mismatch still returns false, but without an early
// character-by-character bail.
function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

let bannerBytes = null;
function getBanner() {
  if (!bannerBytes) {
    const bin = atob(BANNER_JPEG_B64);
    bannerBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bannerBytes[i] = bin.charCodeAt(i);
  }
  return bannerBytes;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      // One-off, idempotent trigger to push the bot's profile description (with
      // the Farsi bidi fix) to Telegram. Safe to hit: it only re-applies the
      // baked-in text, and skips the API call once the stored version matches.
      if (url.searchParams.get("sync") === "profile") {
        const r = await syncBotProfile(env, { force: url.searchParams.get("force") === "1" });
        return new Response(JSON.stringify(r), {
          headers: { "Content-Type": "application/json;charset=utf-8" },
        });
      }
      return new Response("Nova Install Bot is running.", { status: 200 });
    }

    // Welcome/menu banner. Served here so the bot is self-contained (Telegram
    // fetches this URL for the menu photo).
    if (request.method === "GET" && (url.pathname === "/banner.jpg" || url.pathname === "/banner.png")) {
      return new Response(getBanner(), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // AI self-test for `wrangler dev` sessions. Only reachable when BOT_TOKEN
    // is absent, which is never true in production, so this is dev-only.
    if (request.method === "GET" && url.pathname === "/ai-selftest" && !env.BOT_TOKEN) {
      const q = url.searchParams.get("q") || "How do I install my panel?";
      const lang = url.searchParams.get("lang") || "en";
      try {
        const r = await autoAnswer(env, q, lang);
        return new Response(JSON.stringify(r, null, 2), {
          headers: { "Content-Type": "application/json;charset=utf-8" },
        });
      } catch (e) {
        return new Response("error: " + (e && e.message), { status: 500 });
      }
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return handleAdmin(request, env, ctx, url);
    }

    // Re-register this bot's Telegram webhook with the current WEBHOOK_SECRET, using the
    // BOT_TOKEN the worker already holds. Guarded by the secret itself (constant-time
    // compare), so only someone who already knows WEBHOOK_SECRET can call it. It can only
    // point the webhook at this worker's own /webhook and always uses env.WEBHOOK_SECRET as
    // the secret_token, so it cannot redirect updates elsewhere or expose the token. It
    // preserves the existing allowed_updates so delivery behavior does not change.
    if (request.method === "POST" && url.pathname === "/setup/register-webhook") {
      const key = request.headers.get("X-Setup-Key") || "";
      if (!env.WEBHOOK_SECRET || !env.BOT_TOKEN || !timingSafeEqual(key, env.WEBHOOK_SECRET)) {
        return new Response("forbidden", { status: 403 });
      }
      const api = `https://api.telegram.org/bot${env.BOT_TOKEN}`;
      let allowed;
      try {
        const info = await (await fetch(`${api}/getWebhookInfo`)).json();
        allowed = info && info.result && info.result.allowed_updates;
      } catch (e) {}
      const body = { url: `${url.origin}/webhook`, secret_token: env.WEBHOOK_SECRET };
      if (Array.isArray(allowed) && allowed.length) body.allowed_updates = allowed;
      // During a recovery or migration Telegram may have accumulated a large backlog.
      // Dropping it is deliberately opt-in so normal webhook re-registration never loses
      // messages, while an operator can prevent a stale replay from overwhelming D1.
      if (url.searchParams.get("drop_pending_updates") === "true") {
        body.drop_pending_updates = true;
      }
      const r = await fetch(`${api}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return new Response(await r.text(), { status: r.ok ? 200 : 502, headers: { "Content-Type": "application/json" } });
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      // Fail closed: require WEBHOOK_SECRET and an exact header match. If the secret
      // is unset the webhook is unauthenticated and anyone could POST a forged Telegram
      // update (spoofing chat/user ids to ban users, approve AI answers, etc.), so we
      // reject rather than process. Register the webhook with this same secret_token:
      //   setWebhook(url=.../webhook, secret_token=<WEBHOOK_SECRET>)
      if (!env.WEBHOOK_SECRET ||
          !timingSafeEqual(request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "", env.WEBHOOK_SECRET)) {
        return new Response("forbidden", { status: 403 });
      }
      let update;
      try { update = await request.json(); } catch { return new Response("ok"); }
      ctx.waitUntil(handleUpdate(update, env).catch((e) => {
        console.error("update error:", e && e.stack || e);
      }));
      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  },

  // Cron (20:30 UTC = 00:00 Iran): sweep the day's community-group chatter,
  // keeping channel forwards. No-op unless community_cleanup is on.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(Promise.all([
      sweepCommunityGroup(env).then((r) => {
        console.log("community sweep:", JSON.stringify(r));
      }).catch((e) => {
        console.error("community sweep error:", e && e.stack || e);
      }),
      pruneExpiredUpdateSessions(env).catch((e) => {
        console.error("update-session cleanup error:", e && e.stack || e);
      }),
    ]));
  },
};
