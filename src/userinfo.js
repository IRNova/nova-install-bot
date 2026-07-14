// Builds an admin-facing "who is this" card for a Telegram user, using only
// what the Bot API exposes: profile (name / username / bio / photo / premium /
// language), a rough account-age estimate from the numeric id, and the user's
// own history with this bot. No phone, IP, or identity — Telegram doesn't give
// bots those.

import { tg, esc } from "./telegram.js";

// Telegram user ids are handed out roughly in order, so the magnitude of an id
// is a coarse proxy for how old the account is. Anchors are approximate; we
// only use them to say "new / throwaway" vs "established". Labelled ≈ so nobody
// treats it as exact.
const ID_ANCHORS = [
  [1e5, 2013], [1e8, 2016], [2e8, 2017], [4e8, 2018], [7e8, 2019],
  [1e9, 2020], [1.5e9, 2021], [2e9, 2022], [3e9, 2022.8],
  [5e9, 2023.5], [6e9, 2023.9], [7e9, 2024.5], [7.6e9, 2025],
];

function approxAccountEra(id) {
  const n = Number(id);
  if (!n || n < 0) return null;
  let year;
  if (n <= ID_ANCHORS[0][0]) year = ID_ANCHORS[0][1];
  else if (n >= ID_ANCHORS[ID_ANCHORS.length - 1][0]) year = ID_ANCHORS[ID_ANCHORS.length - 1][1];
  else {
    for (let i = 1; i < ID_ANCHORS.length; i++) {
      const [x1, y1] = ID_ANCHORS[i - 1], [x2, y2] = ID_ANCHORS[i];
      if (n <= x2) { year = y1 + (y2 - y1) * ((n - x1) / (x2 - x1)); break; }
    }
  }
  const y = Math.round(year);
  // "New" if within roughly the last year and a half of our anchor range.
  const tag = year >= 2024.5 ? " · likely new/throwaway" : year <= 2019 ? " · long-standing" : "";
  return `≈ ${y}${tag}`;
}

export async function gatherUserCard(env, userId, from) {
  // 1) Live profile via getChat (works because they've messaged the bot).
  let chat = {};
  try {
    const r = await tg(env, "getChat", { chat_id: userId });
    if (r && r.ok) chat = r.result || {};
  } catch {}

  // 2) First profile photo, if their privacy allows it.
  let photo = null;
  try {
    const p = await tg(env, "getUserProfilePhotos", { user_id: userId, limit: 1 });
    if (p && p.ok && p.result && p.result.total_count > 0) {
      const sizes = p.result.photos[0];
      photo = sizes[sizes.length - 1].file_id; // largest
    }
  } catch {}

  // 3) Our own record of them.
  const row = await env.DB.prepare(
    "SELECT lang, installs, banned, first_seen, last_seen FROM users WHERE id = ?"
  ).bind(userId).first();

  const f = from || {};
  const first = chat.first_name || f.first_name || "";
  const last = chat.last_name || f.last_name || "";
  const name = `${first} ${last}`.trim() || "(no name)";
  const username = chat.username || f.username;
  const premium = (chat.is_premium ?? f.is_premium) ? "Yes ⭐" : "No";
  const lang = f.language_code || (row && row.lang) || "?";
  const era = approxAccountEra(userId);

  const lines = [
    `🔎 <b>${esc(name)}</b>`,
    username ? `Username: @${esc(username)} (<a href="https://t.me/${esc(username)}">open</a>)`
             : `Username: none · <a href="tg://user?id=${userId}">open profile</a>`,
    `User ID: <code>${userId}</code>`,
    chat.bio ? `Bio: <i>${esc(chat.bio)}</i>` : null,
    `Telegram Premium: ${premium}`,
    `Language: ${esc(lang)}`,
    era ? `Account age (est. from ID): ${era}` : null,
  ];

  if (row) {
    const hist = [];
    if (row.first_seen) hist.push(`first seen ${String(row.first_seen).slice(0, 10)}`);
    if (row.installs) hist.push(`${row.installs} panel${row.installs === 1 ? "" : "s"} built`);
    if (row.banned) hist.push("🚫 currently blocked");
    if (hist.length) lines.push(`With this bot: ${hist.join(" · ")}`);
  } else {
    lines.push("With this bot: first contact");
  }

  return { text: lines.filter(Boolean).join("\n"), photo };
}
