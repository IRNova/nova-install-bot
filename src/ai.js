// AI support: auto-answer user questions from a knowledge pack (Nova reference
// doc + FAQ + past human answers), and draft FAQ entries from real questions.
//
// Provider selection is automatic:
//   • ANTHROPIC_API_KEY secret set  → Claude (best Persian quality, paid)
//   • otherwise                     → Cloudflare Workers AI (free, 10,000
//                                     neurons/day included, no key needed)
// With neither available, every entry point reports "disabled" and the bot
// falls back to human support.

import Anthropic from "@anthropic-ai/sdk";
import { getConfig, listFaq, listAnsweredQa, bumpAiUsage } from "./db.js";
import { rankByRelevance } from "./retrieve.js";

export async function aiEnabled(env) {
  if (!env.ANTHROPIC_API_KEY && !env.AI) return false;
  return (await getConfig(env, "ai_enabled", "1")) === "1";
}

function client(env) {
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 90_000 });
}

async function model(env) {
  return (await getConfig(env, "ai_model", "claude-opus-4-8")).trim() || "claude-opus-4-8";
}

async function cfModel(env) {
  return (await getConfig(env, "ai_cf_model", "@cf/meta/llama-3.3-70b-instruct-fp8-fast")).trim() ||
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
}

// One JSON-constrained completion via whichever provider is available.
// Returns the parsed object, or null when the provider refused / misbehaved.
async function runJson(env, { system, user, schema, maxTokens = 1024, effort = "low" }) {
  if (env.ANTHROPIC_API_KEY) {
    const response = await client(env).messages.create({
      model: await model(env),
      max_tokens: maxTokens,
      output_config: { effort, format: { type: "json_schema", schema } },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content.find((b) => b.type === "text");
    return text && text.text ? JSON.parse(text.text) : null;
  }
  // Free path: Workers AI with JSON-schema constrained output. The first call
  // on a cold isolate intermittently fails (error 1031), so retry once.
  const m = await cfModel(env);
  const payload = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_schema", json_schema: schema },
    max_tokens: maxTokens,
  };
  let r;
  try {
    r = await env.AI.run(m, payload);
  } catch (e) {
    const msg = (e && e.message) || "";
    // Error 4006 = the daily free neuron allowance is spent. That is a wall,
    // not a blip: retrying just fails again a second later. When it frees up is
    // not documented and is not the 00:00 UTC analytics rollover (verified
    // 2026-07-17: the counter reset, the wall did not).
    if (msg.includes("4006") || msg.includes("daily free allocation")) {
      console.log("workers-ai: daily free neurons exhausted, no AI until the allowance frees up");
      await bumpAiUsage(env, { blocked: true }).catch(() => {});
      throw e;
    }
    console.log("workers-ai retry after:", msg);
    await new Promise((res) => setTimeout(res, 400));
    r = await env.AI.run(m, payload);
  }
  // Count the spend before parsing: a malformed response still cost the same.
  await bumpAiUsage(env, { tokens: (r && r.usage && r.usage.total_tokens) || 0 }).catch(() => {});
  const out = r && r.response;
  if (out == null) return null;
  return typeof out === "string" ? JSON.parse(out) : out;
}

// Static reference about Nova. Kept compact on purpose: this plus the FAQ and
// past answers is the ONLY thing the assistant may answer from.
const NOVA_REFERENCE = `
Nova Proxy is a free, self-hosted proxy panel that runs on the user's own free
Cloudflare account (Worker + D1 + KV). It is built for high-censorship networks
like Iran. There is no shared server; each user owns their panel, domain and data.

This Telegram bot (@IRNovaProxy_Bot) can:
- Build a new panel: the user taps "Get my token", creates a pre-filled
  Cloudflare API token, and pastes it in the chat. The bot deletes the token
  message immediately, never stores it, and builds the panel in about a minute.
- Update an existing panel to the latest Nova version: same token flow, then
  the user picks their Worker from a list. Settings, users and data are kept.

Common issues and facts:
- The token must be created with the pre-filled Cloudflare Workers template and
  copied in full (one line, 40 characters, no spaces). It is shown only once.
  Copy the API Token, not the Global API Key and not the account email.
- In Iran, cloudflare.com and workers.dev are filtered. To create the token the
  user should turn on their current VPN first. To use the panel long-term they
  should add a Custom Domain in Cloudflare (Workers -> their worker ->
  Settings -> Domains & Routes) because workers.dev is blocked.
- A new panel address can take 1-3 minutes to go live worldwide; if the link
  errors at first, wait a minute and refresh.
- After install, the user must set their admin password using the button the
  bot sends, then open the panel, create users, and import the subscription
  link into a client app.
- Subscription links work as Auto, Base64, or Clash format and import into most
  apps (Nova Client, v2rayNG, Clash Meta, FlClash, Karing).
- Recommended client: Nova Client. Android APK:
  https://github.com/IRNova/Nova-Client/releases/latest/download/nova-client.apk
  All platforms: https://github.com/IRNova/Nova-Client/releases
- Voice/video calls (WhatsApp, Telegram, FaceTime) use UDP which a plain free
  Worker cannot carry; the user should enable the WARP node or a backend server
  in their panel settings.
- The panel source: https://github.com/IRNova/Nova-Proxy
  Official channel: https://t.me/irnova_proxy
- Everything is free. Nova never sells subscriptions.
`;

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    confident: {
      type: "boolean",
      description: "true only if the knowledge pack clearly covers the question and the answer is safe to send without a human",
    },
    answer: { type: "string", description: "The reply to send to the user, in their language" },
  },
  required: ["confident", "answer"],
  additionalProperties: false,
};

async function knowledgePack(env, question) {
  // The AI draws on everything the team has ever answered plus the whole FAQ,
  // but only the entries most relevant to THIS question go into the prompt.
  // That keeps the pack small (cost and latency scale with prompt size) while
  // still learning from all of it, and it scales as the FAQ and history grow.
  // Ranking is lexical and runs here, so it costs nothing.
  const faq = await listFaq(env).catch(() => []);
  const hist = await listAnsweredQa(env, { sources: ["human", "approved"], limit: 300 }).catch(() => []);
  const pool = [
    // Curated FAQ answers outrank raw chat answers on a tie via the boost.
    ...faq.map((f) => ({ question: f.question, answer: f.answer, faq: true, boost: 1.4 })),
    ...hist.map((h) => ({ question: h.question, answer: h.answer, faq: false })),
  ];
  const picked = question
    ? rankByRelevance(question, pool, 10)
    : pool.slice(0, 8); // no question (e.g. a warm-up): fall back to a sample

  let kb = NOVA_REFERENCE;
  if (picked.length) {
    kb += "\n\nRelevant knowledge, chosen because it resembles the current " +
      "question (official FAQ entries and answers the human support team has given):\n" +
      picked.map((r) => `Q: ${String(r.question).slice(0, 300)}\nA: ${String(r.answer).slice(0, 700)}`).join("\n---\n");
  }
  return kb;
}

// Try to answer a support question. Returns {confident, answer} or null on any
// failure (caller falls back to human support).
export async function autoAnswer(env, question, lang) {
  const kb = await knowledgePack(env, question);
  const language = lang === "fa" ? "Persian (Farsi)" : lang === "ru" ? "Russian" : "English";
  const out = await runJson(env, {
    schema: ANSWER_SCHEMA,
    maxTokens: 1024,
    effort: "low",
    system:
      "You are the support assistant for the Nova Proxy Telegram bot. " +
      "Answer ONLY from the knowledge pack below. Rules:\n" +
      "- Set confident=false when the question is not clearly covered, involves account " +
      "security, payments, lost data, legal topics, a bug report, or an angry/frustrated user. " +
      "A human will take over; do not guess.\n" +
      "- Managing or deleting Cloudflare resources (workers, databases, KV, tokens) beyond the " +
      "bot's own install/update flow is NOT covered: set confident=false.\n" +
      "- Never invent URLs, commands, or facts. Only use links that appear in the knowledge pack.\n" +
      "- Never ask the user to share their Cloudflare token, password, or subscription link in chat " +
      "beyond what the bot's own install/update flow does.\n" +
      "- Keep answers under 900 characters, friendly and concrete. Telegram HTML only: " +
      "<b>, <i>, <code>, <a href>. No markdown.\n" +
      "- If the user should use a bot feature, name the exact button (for example the install " +
      "or update button on the /start menu).\n\n" +
      "KNOWLEDGE PACK:\n" + kb,
    user: `User language: ${language}. Reply in that language.\n\nQuestion:\n${question}`,
  });
  if (!out || typeof out.confident !== "boolean" || typeof out.answer !== "string") return null;
  return out;
}

const FAQ_SCHEMA = {
  type: "object",
  properties: {
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
  },
  required: ["faqs"],
  additionalProperties: false,
};

// Draft new FAQ entries from recent real questions. Inserts them DISABLED so
// the admin reviews and enables them in the panel. Returns the drafts.
export async function suggestFaqs(env) {
  const recent = await listAnsweredQa(env, { limit: 100 });
  if (!recent.length) return [];
  const existing = await listFaq(env, false).catch(() => []);
  const out = await runJson(env, {
    schema: FAQ_SCHEMA,
    maxTokens: 4096,
    effort: "high",
    system:
      "You maintain the FAQ of the Nova Proxy support bot (a free self-hosted proxy panel " +
      "for censored networks). From the real support exchanges provided, draft NEW FAQ entries:\n" +
      "- Only recurring or clearly useful questions; merge duplicates into one entry.\n" +
      "- Skip anything already covered by the existing FAQ list.\n" +
      "- Write each entry in the language its users asked in (mostly Persian). Keep the question " +
      "short and the answer complete but tight. Telegram HTML only: <b>, <i>, <code>, <a href>.\n" +
      "- Prefer answers the human team gave; never invent facts or links.\n" +
      "- Return at most 6 entries. Return an empty list if nothing new is worth adding.",
    user:
      "Existing FAQ questions (do not duplicate):\n" +
      (existing.map((f) => "- " + f.question).join("\n") || "(none)") +
      "\n\nRecent support exchanges (Q = user, A = answer, [ai] = answered by the assistant):\n" +
      recent.map((r) => `Q: ${r.question}\nA${r.source === "ai" ? " [ai]" : ""}: ${r.answer}`).join("\n---\n"),
  });
  const drafts = out && Array.isArray(out.faqs) ? out.faqs.filter((f) => f.question && f.answer) : [];
  for (const f of drafts) {
    await env.DB.prepare(
      "INSERT INTO faq (question, answer, position, enabled) VALUES (?, ?, 999, 0)"
    ).bind(f.question.slice(0, 300), f.answer.slice(0, 3500)).run();
  }
  return drafts;
}
