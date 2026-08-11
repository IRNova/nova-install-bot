/* Bidi isolation for values dropped into mixed Farsi/English copy.
 *
 * Reported from a live admin group: "✍️ Reply to user / پاسخ به user". It reads
 * fine there only because the fallback name is the plain word "user". Give it a
 * real "@ali_2024" and the direction leaks across the boundary, taking the
 * punctuation with it. The bug is invisible in every test written with an
 * English name, which is how it shipped.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bidi, escBidi, esc } from "../src/telegram.js";
import { t } from "../src/i18n.js";

const FSI = "⁨", PDI = "⁩";

test("bidi wraps in FSI/PDI and leaves empty values alone", () => {
  assert.equal(bidi("ali"), `${FSI}ali${PDI}`);
  // FSI, not LRI: these values are names, and a Farsi name inside an English
  // sentence needs to read RTL just as much as the reverse.
  assert.equal(bidi("ali").codePointAt(0), 0x2068);
  for (const empty of ["", null, undefined]) {
    assert.equal(bidi(empty), "", "an empty value must not become two invisible characters");
  }
});

test("escBidi escapes first, then isolates", () => {
  // The isolates are not HTML and must never be fed through esc().
  assert.equal(escBidi("<b>&"), `${FSI}&lt;b&gt;&amp;${PDI}`);
  assert.ok(!escBidi("<b>").includes("&#"), "the isolate characters were escaped");
});

test("the Farsi strings isolate their interpolated value and the English ones do not", () => {
  for (const [key, arg] of [["menu_hi", "ali_2024"], ["upd_done", "nova-panel"], ["upd_confirm", "nova-panel"]]) {
    const fa = t("fa", key, arg);
    assert.ok(fa.includes(`${FSI}${arg}${PDI}`), `fa/${key} does not isolate its value: ${fa}`);
    // English copy is LTR throughout, so isolating there would add invisible
    // characters that buy nothing.
    assert.ok(!t("en", key, arg).includes(FSI), `en/${key} isolates needlessly`);
  }
});

test("a name in HTML copy is escaped, and one in plain-text copy is not", () => {
  /* Two different call sites with two different rules, and getting them the
   * wrong way round is silent either way: escaping plain text prints "&amp;" to
   * the group, and not escaping HTML breaks the mention link. */
  const src = readFileSync(new URL("../src/bot.js", import.meta.url), "utf8");

  // The Reply prompt is sent with parse_mode HTML.
  assert.match(src, /Reply to \$\{escBidi\(name\)\}<\/b> \/ پاسخ به \$\{escBidi\(name\)\}/);

  // The card note goes through appendToCard -> editCard, which sends `entities`
  // and never sets parse_mode.
  assert.match(src, /🗑 Closed by \$\{bidi\(who\)\}/);
  assert.ok(!/Closed by \$\{escBidi/.test(src), "the plain-text note is being HTML-escaped");

  // The community notice interpolates a value that is ALREADY an <a> tag.
  assert.match(src, /🚫 \$\{bidi\(name\)\} was removed/);
  assert.ok(!/🚫 \$\{escBidi\(name\)\}/.test(src), "an existing <a> mention is being escaped into markup");
});

test("isolating the product tag does not break retagging the card", async () => {
  /* retagCard finds the tag with indexOf and swaps it in place. The isolates sit
   * outside the match, so the swap has to leave them where they are and shift
   * the entity offsets by the difference in the tags, not the wrapper. */
  const { PRODUCTS } = await import("../src/bot.js");
  const proxy = PRODUCTS.proxy.tag, server = PRODUCTS.server.tag;
  const text = `✉️ New message / پیام جدید   ${bidi(proxy)}\n\n“hi”`;

  const at = text.indexOf(proxy);
  assert.ok(at > 0, "the tag is not findable inside the isolates");
  const swapped = text.slice(0, at) + server + text.slice(at + proxy.length);
  assert.ok(swapped.includes(`${FSI}${server}${PDI}`), `isolates lost in the swap: ${JSON.stringify(swapped)}`);
  assert.ok(!swapped.includes(proxy), "the old tag survived the swap");

  // Offsets are counted in UTF-16 code units, and the two tags differ in length.
  assert.equal(server.length - proxy.length, 1);
});
