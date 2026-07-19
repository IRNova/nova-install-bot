// Lexical retrieval over the answered-question history, so the AI can draw on
// every past answer while each prompt stays small. No embeddings, no vector
// service, no extra model call: the whole point is to lower cost, not add it.
//
// For a support corpus of hundreds of short, repetitive questions this is
// enough. Matching a new question against past questions ("this looks like one
// we answered, here is how") is a strong signal on its own, and IDF weighting
// keeps common filler words from dominating. If the corpus ever grows into the
// thousands and meaning-not-words recall starts to matter, this is the seam to
// swap for embeddings.

// Persian text arrives with Arabic look-alikes, diacritics and zero-width
// joiners; fold them so "mi-konam" spelled with or without a ZWNJ matches.
function normalize(s) {
  return String(s || "")
    .replace(/[يى]/g, "ی") // Arabic ya / alef maksura -> Persian ye
    .replace(/ك/g, "ک")          // Arabic kaf -> Persian ke
    .replace(/[أإآ]/g, "ا") // alef variants -> bare alef
    .replace(/[ً-ْٰ]/g, "")      // harakat / tanwin / superscript alef
    .replace(/[​-‏‪-‮﻿]/g, " ") // ZWNJ and bidi marks
    .toLowerCase();
}

// Very common Persian and English words that carry little topical signal.
const STOP = new Set([
  "و", "در", "به", "از", "که",
  "این", "را", "با", "برای",
  "من", "شما", "هم", "رو", "یه",
  "یک", "است", "هست", "می",
  "تا", "اما", "ولی", "چه",
  "چی", "اگر", "بود", "ها",
  "های", "خیلی",
  "the", "a", "an", "of", "to", "in", "is", "it", "for", "and", "or", "my",
  "i", "you", "how", "do", "on", "at", "with", "can", "me", "this", "that",
]);

function tokenize(s) {
  const out = [];
  for (const w of normalize(s).split(/[^0-9a-z؀-ۿ]+/)) {
    if (w.length >= 2 && !STOP.has(w)) out.push(w);
  }
  return out;
}

// Rank candidates by relevance to `question` and return the top `k`.
// Each candidate is {question, answer, ...}; matching is against its question
// text (with a light bonus for hits in the answer). Candidates that share no
// meaningful term are dropped, so an unrelated question retrieves nothing
// rather than filler.
export function rankByRelevance(question, candidates, k = 6) {
  const qToks = tokenize(question);
  if (!qToks.length || !candidates.length) return [];

  // Document frequency across the candidate pool, over question text.
  const docTokens = candidates.map((c) => new Set(tokenize(c.question)));
  const df = new Map();
  for (const set of docTokens) for (const t of set) df.set(t, (df.get(t) || 0) + 1);
  const N = candidates.length;
  const idf = (t) => Math.log(1 + N / ((df.get(t) || 0) + 0.5));

  const qSet = new Set(qToks);
  const scored = candidates.map((c, i) => {
    let score = 0;
    for (const t of qSet) if (docTokens[i].has(t)) score += idf(t);
    // Small bonus when the answer also mentions a query term.
    if (score > 0) {
      const aToks = new Set(tokenize(c.answer));
      for (const t of qSet) if (aToks.has(t)) score += idf(t) * 0.25;
      // Optional per-candidate weight, e.g. curated FAQ over raw chat answers.
      score *= c.boost || 1;
    }
    return { c, score };
  }).filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((x) => x.c);
}
