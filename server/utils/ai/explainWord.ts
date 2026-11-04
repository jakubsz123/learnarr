import { z } from "zod";
import { languageName } from "#shared/languages";
import { AiError, complete, type AiConfig } from "./client";
import { extractJson, wordFields } from "./answer";

export interface WordRequest {
  language: string;
  nativeLanguage: string;
  /** The word as used in the line. */
  form: string;
  /** Its dictionary form, when the lemmatiser knows it. */
  lemma: string | null;
  line: string;
}

export interface ExplainedWord {
  term: string;
  translation: string;
  partOfSpeech: string | null;
  note: string | null;
}

const answerSchema = z.object({
  term: z.string().trim().min(1).max(80),
  translation: z.string().trim().min(1).max(200),
  partOfSpeech: z.string().trim().max(20).optional().nullable(),
  note: z.string().trim().max(200).optional().nullable(),
});

export function buildWordPrompt(req: WordRequest): { system: string; user: string } {
  const target = languageName(req.language);
  const native = languageName(req.nativeLanguage);
  const system = [
    `You help a ${native} speaker learning ${target} who tapped a word in a TV subtitle.`,
    "If the word is part of a fixed expression in this line, describe the expression. Give:",
    ...wordFields(native),
    'Answer with JSON only: {"term": "", "translation": "", "partOfSpeech": "", "note": ""}',
  ].join("\n");
  const user = [
    `Line: ${req.line.replace(/\n/g, " ")}`,
    `Word: ${req.form}`,
    ...(req.lemma && req.lemma !== req.form
      ? [`Dictionary form (from a tagger, may be wrong): ${req.lemma}`]
      : []),
  ].join("\n");
  return { system, user };
}

/** Ask the AI what one word means in its line. */
export async function explainWord(
  config: AiConfig,
  req: WordRequest,
  fetchImpl?: typeof fetch,
): Promise<ExplainedWord> {
  const { system, user } = buildWordPrompt(req);
  const parsed = answerSchema.safeParse(extractJson(await complete(config, system, user, fetchImpl)));
  if (!parsed.success) throw new AiError("errors.ai.wrongShape");
  return {
    term: parsed.data.term,
    translation: parsed.data.translation,
    partOfSpeech: parsed.data.partOfSpeech || null,
    note: parsed.data.note || null,
  };
}
