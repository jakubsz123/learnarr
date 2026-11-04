import { and, eq } from "drizzle-orm";
import { parseSubtitle } from "#shared/subtitles";
import { wordKey } from "#shared/words";
import { schema, type Db } from "../db";
import type { AiConfig } from "./ai/client";
import { explainWord } from "./ai/explainWord";
import type { AppUser } from "./auth";
import { createCard } from "./cards";
import { AppError } from "./errors";
import { setKnown } from "./knownWords";

/** Where a tapped word is: its line, and its place in the line's text. */
export interface WordUse {
  cue: number;
  start: number;
  end: number;
}

/**
 * Make a card from a word the learner tapped. The AI translates it as used in
 * that line; the card keeps the line as its sentence. A word with a card is
 * one the learner is learning, so it stops counting as known, and an AI
 * suggestion for the same word is settled.
 */
export async function cardFromWord(opts: {
  db: Db;
  user: AppUser;
  subtitle: typeof schema.subtitles.$inferSelect;
  use: WordUse;
  lemma: string | null;
  config: AiConfig | null;
}) {
  const { db, user, subtitle, use, lemma } = opts;
  const cue = parseSubtitle(subtitle.content)[use.cue];
  const form = cue?.text.slice(use.start, use.end).trim();
  if (!cue || !form || use.end <= use.start) throw new AppError(400, "errors.subtitles.wordNotFound");
  if (!opts.config) throw new AppError(409, "errors.ai.notConfigured");

  const explained = await explainWord(opts.config, {
    language: subtitle.language,
    nativeLanguage: user.nativeLanguage,
    form,
    lemma,
    line: cue.text,
  });
  const result = createCard(db, {
    userId: user.id,
    subtitleId: subtitle.id,
    mediaItemId: subtitle.mediaItemId,
    language: subtitle.language,
    term: explained.term,
    form,
    translation: explained.translation,
    partOfSpeech: explained.partOfSpeech,
    note: explained.note,
    sentence: cue.text,
    sentenceStartMs: cue.startMs,
  });
  db.delete(schema.suggestions)
    .where(
      and(
        eq(schema.suggestions.userId, user.id),
        eq(schema.suggestions.language, subtitle.language),
        eq(schema.suggestions.term, explained.term),
      ),
    )
    .run();
  for (const word of new Set([wordKey(lemma ?? form), wordKey(explained.term)])) {
    setKnown(db, user.id, subtitle.language, word, false);
  }
  return result;
}
