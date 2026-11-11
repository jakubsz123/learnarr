import { and, eq } from "drizzle-orm";
import { VERSION } from "#shared/version";
import { schema, type Db } from "../db";
import type { DictionaryEntry } from "../db/schema";

/**
 * Definitions from Wiktionary, free and keyless. English Wiktionary's
 * definition API has a section per language for a word, keyed by language
 * code, so one lookup works for every language Learnarr offers; the
 * definitions are in English.
 */

const API = "https://en.wiktionary.org/api/rest_v1/page/definition";
// Wikimedia asks API clients to say who they are, and may block those that don't.
const USER_AGENT = `Learnarr/${VERSION} (https://github.com/smoothless-io/learnarr)`;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 3;
const MAX_DEFINITIONS = 4;

// Wiktionary inlines template stylesheets in definitions; drop them with their contents.
const STYLE_OR_SCRIPT = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
// A "form of" definition (a plural, a conjugation) marks the link to its base word.
const FORM_OF_LINK = /class="form-of-definition-link"[\s\S]*?href="\/wiki\/([^"#]+)/;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function plainText(html: string): string {
  return html
    .replace(STYLE_OR_SCRIPT, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
      if (body[0] !== "#") return ENTITIES[body.toLowerCase()] ?? match;
      const code = body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return code > 0 ? String.fromCodePoint(code) : match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

interface RawEntry {
  partOfSpeech?: string;
  definitions?: { definition?: string }[];
}

/** The entries for one language from a Wiktionary definition response. */
export function parseDefinitions(
  response: unknown,
  language: string,
): { entries: DictionaryEntry[]; formOf?: string } {
  const sections = (response as Record<string, RawEntry[]> | null)?.[language];
  if (!Array.isArray(sections)) return { entries: [] };
  let formOf: string | undefined;
  const entries: DictionaryEntry[] = [];
  for (const section of sections.slice(0, MAX_ENTRIES)) {
    const raw = (section.definitions ?? []).map((d) => d.definition ?? "").filter(Boolean);
    const target = raw.length === 1 ? FORM_OF_LINK.exec(raw[0]!)?.[1] : undefined;
    if (target) formOf ??= decodeURIComponent(target).replace(/_/g, " ");
    const definitions = raw.map(plainText).filter(Boolean).slice(0, MAX_DEFINITIONS);
    if (definitions.length)
      entries.push({ partOfSpeech: plainText(section.partOfSpeech ?? ""), definitions });
  }
  return { entries, formOf };
}

async function fetchEntries(
  word: string,
  language: string,
  fetchFn: typeof fetch,
): Promise<DictionaryEntry[]> {
  const get = async (w: string) => {
    const response = await fetchFn(`${API}/${encodeURIComponent(w)}`, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return null;
    // Anything else (rate limits, outages) isn't an answer, and mustn't be cached as one.
    if (!response.ok) throw new Error(`Wiktionary answered ${response.status}`);
    return response.json();
  };
  const first = parseDefinitions(await get(word), language);
  // "plural of gato" is no help: show gato's definitions, saying where they're from.
  if (first.formOf && first.formOf.toLowerCase() !== word.toLowerCase() && first.entries.length === 1) {
    const base = parseDefinitions(await get(first.formOf), language);
    if (base.entries.length) return base.entries.map((entry) => ({ ...entry, formOf: first.formOf }));
  }
  return first.entries;
}

/**
 * Definitions of a word in a language, from the cache when it's fresh. Tries
 * the dictionary form first, then the form used. Null means Wiktionary
 * couldn't be reached; an empty list means it has nothing.
 */
export async function define(
  db: Db,
  language: string,
  words: string[],
  fetchFn: typeof fetch = fetch,
  now = Date.now(),
): Promise<{ word: string; entries: DictionaryEntry[] } | null> {
  let reached = false;
  for (const word of new Set(words.map((w) => w.toLowerCase()))) {
    const cached = db
      .select()
      .from(schema.dictionaryEntries)
      .where(and(eq(schema.dictionaryEntries.language, language), eq(schema.dictionaryEntries.word, word)))
      .get();
    let entries = cached && now - cached.fetchedAt.getTime() < TTL_MS ? cached.entries : undefined;
    if (entries === undefined) {
      try {
        entries = await fetchEntries(word, language, fetchFn);
      } catch {
        continue;
      }
      db.insert(schema.dictionaryEntries)
        .values({ language, word, entries: entries.length ? entries : null, fetchedAt: new Date(now) })
        .onConflictDoUpdate({
          target: [schema.dictionaryEntries.language, schema.dictionaryEntries.word],
          set: { entries: entries.length ? entries : null, fetchedAt: new Date(now) },
        })
        .run();
    }
    reached = true;
    if (entries?.length) return { word, entries };
  }
  return reached ? { word: words[0] ?? "", entries: [] } : null;
}
