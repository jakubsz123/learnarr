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

// Learnarr's code → the folder FrequencyWords keeps it in. Japanese is left out
// on purpose (its list is split into word stems, not words) and Hindi has no list.
const SOURCES = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "pt",
  nl: "nl",
  pl: "pl",
  cs: "cs",
  sk: "sk",
  da: "da",
  sv: "sv",
  no: "no",
  fi: "fi",
  ru: "ru",
  uk: "uk",
  tr: "tr",
  el: "el",
  hu: "hu",
  ro: "ro",
  ko: "ko",
  zh: "zh_cn",
  ar: "ar",
};

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
  const res = await fetch(`${BASE}/${SOURCES[code]}/${SOURCES[code]}_50k.txt`);
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
