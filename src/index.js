// Nova Install Bot — entry point.
//
// Two surfaces on one Worker:
//   • /webhook  — Telegram updates (install flow, menu, FAQ, contact)
//   • /admin    — password-protected web panel to manage content + broadcast
//
// Secrets (wrangler secret put, never committed):
//   BOT_TOKEN, WEBHOOK_SECRET, ADMIN_PASSWORD

import { handleUpdate } from "./bot.js";
import { handleAdmin } from "./admin.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("Nova Install Bot is running.", { status: 200 });
    }

    if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
      return handleAdmin(request, env, ctx, url);
    }

    if (request.method === "POST" && url.pathname === "/webhook") {
      if (env.WEBHOOK_SECRET &&
          request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
        return new Response("forbidden", { status: 403 });
      }
      let update;
      try { update = await request.json(); } catch { return new Response("ok"); }
      ctx.waitUntil(handleUpdate(update, env).catch(() => {}));
      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  },
};
