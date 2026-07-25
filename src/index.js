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

    if (request.method === "POST" && url.pathname === "/webhook") {
      // Fail closed: require WEBHOOK_SECRET and an exact header match. If the secret
      // is unset the webhook is unauthenticated and anyone could POST a forged Telegram
      // update (spoofing chat/user ids to ban users, approve AI answers, etc.), so we
      // reject rather than process. Register the webhook with this same secret_token:
      //   setWebhook(url=.../webhook, secret_token=<WEBHOOK_SECRET>)
      if (!env.WEBHOOK_SECRET ||
          request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
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
    ctx.waitUntil(sweepCommunityGroup(env).then((r) => {
      console.log("community sweep:", JSON.stringify(r));
    }).catch((e) => {
      console.error("community sweep error:", e && e.stack || e);
    }));
  },
};
