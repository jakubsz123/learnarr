// Builds server/assets/frequency/<lang>.txt: the most common words of each
// language, one per line, most common first.
//
// Source: Hermit Dave's FrequencyWords (https://github.com/hermitdave/FrequencyWords),
// counted over the OpenSubtitles 2018 corpus, CC BY-SA 4.0. The files written
// here are an adaptation of it and carry the same licence.
//
//   node scripts/build-frequency.mjs          every language
//   node scripts/build-frequency.mjs es fr    some of them

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BASE = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018";
const TOP = 10_000;

// Learnarr's code → the folder FrequencyWords keeps it in, and whether only its
// full list exists (most languages have a 50k one). Left out on purpose:
// Japanese (its list is split into word stems, not words), Thai (written without
// spaces, so its words can't be matched without a model) and Georgian (the
// list is mis-encoded).
const SOURCES = {
  af: { folder: "af" },
  ar: { folder: "ar" },
  bg: { folder: "bg" },
  bn: { folder: "bn" },
  bs: { folder: "bs" },
  ca: { folder: "ca" },
  cs: { folder: "cs" },
  da: { folder: "da" },
  de: { folder: "de" },
  el: { folder: "el" },
  en: { folder: "en" },
  es: { folder: "es" },
  et: { folder: "et" },
  eu: { folder: "eu" },
  fa: { folder: "fa" },
  fi: { folder: "fi" },
  fr: { folder: "fr" },
  gl: { folder: "gl" },
  he: { folder: "he" },
  hi: { folder: "hi" },
  hr: { folder: "hr" },
  hu: { folder: "hu" },
  hy: { folder: "hy" },
  id: { folder: "id" },
  is: { folder: "is" },
  it: { folder: "it" },
  ko: { folder: "ko" },
  lt: { folder: "lt" },
  lv: { folder: "lv" },
  mk: { folder: "mk" },
  ms: { folder: "ms" },
  nl: { folder: "nl" },
  no: { folder: "no" },
  pl: { folder: "pl" },
  pt: { folder: "pt" },
  ro: { folder: "ro" },
  ru: { folder: "ru" },
  sk: { folder: "sk" },
  sl: { folder: "sl" },
  sq: { folder: "sq" },
  sr: { folder: "sr" },
  sv: { folder: "sv" },
  ta: { folder: "ta" },
  te: { folder: "te" },
  tl: { folder: "tl" },
  tr: { folder: "tr" },
  uk: { folder: "uk" },
  ur: { folder: "ur" },
  vi: { folder: "vi" },
  zh: { folder: "zh_cn" },
};
const FULL_ONLY = new Set(["af", "hy", "hi", "ta", "te", "tl", "ur"]);

const OUT = fileURLToPath(new URL("../server/assets/frequency/", import.meta.url));

// Subtitle corpora are full of numbers, symbols, stray letters from on-screen
// text and contraction halves ("'s", "n't"); none of those are words to learn.
const LATIN_LETTER = /^[a-z\u00c0-\u024f]$/;
const ONE_LETTER_WORDS = "aeiouyàèéìòùåáíóúwz";

function isWord(word) {
  if (!/\p{L}/u.test(word) || /[\d_]/.test(word) || /^['’-]|['’-]$/.test(word)) return false;
  return word.length > 1 || !LATIN_LETTER.test(word) || ONE_LETTER_WORDS.includes(word);
}

async function build(code) {
  const { folder } = SOURCES[code];
  const res = await fetch(`${BASE}/${folder}/${folder}_${FULL_ONLY.has(code) ? "full" : "50k"}.txt`);
  if (!res.ok) throw new Error(`${code}: ${res.status}`);
  const seen = new Set();
  for (const line of (await res.text()).split(/\r?\n/)) {
    const word = line.split(" ")[0]?.normalize("NFC").toLowerCase();
    if (!word || !isWord(word) || seen.has(word)) continue;
    seen.add(word);
    if (seen.size === TOP) break;
  }
  await writeFile(`${OUT}${code}.txt`, [...seen].join("\n") + "\n");
  console.log(`${code}: ${seen.size} words`);
}

const wanted = process.argv.slice(2);
await mkdir(OUT, { recursive: true });
for (const code of wanted.length ? wanted : Object.keys(SOURCES)) {
  if (!SOURCES[code]) throw new Error(`No frequency list for "${code}"`);
  await build(code);
}
