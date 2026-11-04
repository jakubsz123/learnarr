import { z } from "zod";
import { languageName } from "#shared/languages";
import type { Cue } from "#shared/subtitles";
import { extractJson, wordFields } from "./answer";
import { AiError, complete, type AiConfig } from "./client";

export interface PickedWord {
  term: string;
  form: string;
  translation: string;
  partOfSpeech: string | null;
  note: string | null;
  cue: Cue;
}

export interface PickRequest {
  cues: Cue[];
  language: string;
  nativeLanguage: string;
  level: string;
  count: number;
  /** Terms the learner already has cards for. */
  known: string[];
}

/** Long films are sampled evenly so a prompt stays a size every provider accepts. */
const MAX_LINES = 1200;
const MAX_KNOWN = 400;

const LEVEL_HINT: Record<string, string> = {
  beginner: "a beginner: prefer common, useful everyday words they won't know yet",
  intermediate:
    "an intermediate learner: skip the basics, prefer frequent words and expressions that aren't obvious",
  advanced: "an advanced learner: prefer idioms, colloquial phrases and less common but useful words",
};

export function sampleCues(cues: Cue[], max = MAX_LINES): Cue[] {
  if (cues.length <= max) return cues;
  const step = cues.length / max;
  return Array.from({ length: max }, (_, i) => cues[Math.floor(i * step)]!);
}

export function buildPrompt(req: PickRequest): { system: string; user: string } {
  const target = languageName(req.language);
  const native = languageName(req.nativeLanguage);
  const system = [
    `You choose vocabulary for a ${native} speaker learning ${target} from a TV subtitle.`,
    `Pick the ${req.count} words or short phrases most worth learning for ${LEVEL_HINT[req.level] ?? LEVEL_HINT.intermediate}.`,
    "Skip names, places, numbers, interjections and sound descriptions. Never pick something from the already-learning list.",
    "For each one give:",
    ...wordFields(native),
    '- "form": the exact text as it appears in the line;',
    '- "line": the number of the line where it is used.',
    'Answer with JSON only, no other text: {"words": [{"term": "", "form": "", "translation": "", "partOfSpeech": "", "line": 1, "note": ""}]}',
  ].join("\n");

  const lines = sampleCues(req.cues)
    .map((cue) => `${cue.index + 1}: ${cue.text.replace(/\n/g, " ")}`)
    .join("\n");
  const known = req.known.slice(0, MAX_KNOWN);
  const user = `${known.length ? `Already learning: ${known.join(", ")}\n\n` : ""}Subtitle lines:\n${lines}`;
  return { system, user };
}

const answerSchema = z.object({
  words: z.array(
    z.object({
      term: z.string().trim().min(1).max(80),
      form: z.string().trim().max(80).optional().default(""),
      translation: z.string().trim().min(1).max(200),
      partOfSpeech: z.string().trim().max(20).optional().nullable(),
      line: z.coerce.number().int().positive(),
      note: z.string().trim().max(200).optional().nullable(),
    }),
  ),
});

const fold = (s: string) => s.toLocaleLowerCase().normalize("NFKC");

/**
 * Keep the words that point at a real line containing them. The card's example
 * sentence is that line as heard, so a word the model can't place is dropped
 * rather than shown next to a sentence it isn't in.
 */
export function parseAnswer(text: string, req: Pick<PickRequest, "cues" | "known" | "count">): PickedWord[] {
  const parsed = answerSchema.safeParse(extractJson(text));
  if (!parsed.success) throw new AiError("errors.ai.wrongShape");

  const byNumber = new Map(req.cues.map((cue) => [cue.index + 1, cue]));
  const seen = new Set(req.known.map(fold));
  const words: PickedWord[] = [];

  for (const word of parsed.data.words) {
    const key = fold(word.term);
    if (seen.has(key)) continue;
    const form = word.form || word.term;
    const contains = (cue: Cue) => fold(cue.text).includes(fold(form));
    const cue = [byNumber.get(word.line)].find((c) => c && contains(c)) ?? req.cues.find(contains);
    if (!cue) continue;
    seen.add(key);
    words.push({
      term: word.term,
      form,
      translation: word.translation,
      partOfSpeech: word.partOfSpeech || null,
      note: word.note || null,
      cue,
    });
    if (words.length >= req.count) break;
  }
  return words;
}

export async function pickWords(
  config: AiConfig,
  req: PickRequest,
  fetchImpl?: typeof fetch,
): Promise<PickedWord[]> {
  const { system, user } = buildPrompt(req);
  const answer = await complete(config, system, user, fetchImpl);
  const words = parseAnswer(answer, req);
  if (words.length === 0) throw new AiError("errors.ai.noMatchingLines");
  return words;
}
