/* A button shows its `icon_custom_emoji_id` AND its label. If the label also
 * starts with an emoji, the user sees two, which is what shipped the first time
 * the Nova icons went live.
 *
 * The pairing is easy to get wrong in the direction that looks fine locally:
 * without Telegram Premium the icons do not render at all, so a developer
 * adding an icon and leaving the emoji in place sees nothing wrong.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { t } from "../src/i18n.js";

const src = readFileSync(new URL("../src/bot.js", import.meta.url), "utf8");

// Leading emoji, including skin tones, variation selectors and ZWJ sequences.
const LEADING_EMOJI = /^[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{FE0F}\u{200D}]/u;

const iconKeys = new Set(
  [...src.matchAll(/t\(lang, "([a-z_]+)"\)[^}]*icon_custom_emoji_id/g)].map((m) => m[1]),
);

test("a button with a custom icon has no emoji in its label", () => {
  assert.ok(iconKeys.size >= 7, `expected the menu buttons to carry icons, saw ${iconKeys.size}`);
  const doubles = [];
  for (const key of iconKeys) {
    for (const lang of ["en", "fa"]) {
      const label = t(lang, key);
      if (label && LEADING_EMOJI.test(label)) doubles.push(`${lang}/${key}: ${label}`);
    }
  }
  assert.deepEqual(doubles, [], "these buttons render two emoji, the icon and the label's own");
});

test("every icon id is a plausible custom_emoji_id", () => {
  const ids = [...src.matchAll(/icon_custom_emoji_id: ICON\.([a-z]+)/g)].map((m) => m[1]);
  assert.ok(ids.length >= 7);
  const block = src.slice(src.indexOf("const ICON = {"), src.indexOf("};", src.indexOf("const ICON = {")));
  for (const name of new Set(ids)) {
    const m = new RegExp(`${name}:\\s*"(\\d+)"`).exec(block);
    assert.ok(m, `ICON.${name} is referenced but not defined`);
    // Telegram's ids are long decimal strings; a truncated paste is the likely
    // failure and would silently render no icon.
    assert.ok(m[1].length >= 18, `ICON.${name} looks truncated: ${m[1]}`);
  }
});

test("the two languages agree on which buttons exist", () => {
  const keys = [...new Set([...src.matchAll(/t\(lang, "(btn_[a-z_]+)"\)/g)].map((m) => m[1]))];
  const missing = keys.filter((k) => !t("en", k) || !t("fa", k));
  assert.deepEqual(missing, [], "a button label is missing in one language");
});
