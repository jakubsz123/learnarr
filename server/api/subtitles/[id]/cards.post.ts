import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { parseSubtitle } from "#shared/subtitles";
import { wordKey } from "#shared/words";
import { schema, useDb } from "~~/server/db";
import { AiError } from "~~/server/utils/ai/client";
import { resolveAiConfig } from "~~/server/utils/ai/config";
import { explainWord } from "~~/server/utils/ai/explainWord";

const params = z.object({ id: z.coerce.number().int().positive() });
const body = z.object({
  cue: z.number().int().min(0),
  start: z.number().int().min(0),
  end: z.number().int().min(1),
  lemma: z.string().trim().min(1).max(80).nullable().default(null),
});

/** Make a card from a word the learner tapped: the AI translates it as used in that line. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const input = await validBody(event, body);
  const db = useDb();
  const subtitle = ownSubtitle(db, user.id, id);

  const cue = parseSubtitle(subtitle.content)[input.cue];
  const form = cue?.text.slice(input.start, input.end).trim();
  if (!cue || !form || input.end <= input.start) {
    throw createError({ statusCode: 400, statusMessage: "That word isn't in this subtitle." });
  }
  const config = resolveAiConfig(useSettings());
  if (!config) {
    throw createError({
      statusCode: 409,
      statusMessage: "No AI provider is set up yet. The admin sets one up in Settings.",
    });
  }

  let explained;
  try {
    explained = await explainWord(config, {
      language: subtitle.language,
      nativeLanguage: user.nativeLanguage,
      form,
      lemma: input.lemma,
      line: cue.text,
    });
  } catch (error) {
    if (error instanceof AiError) throw createError({ statusCode: 502, statusMessage: error.message });
    throw error;
  }

  const existing = db
    .select()
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.userId, user.id),
        eq(schema.cards.language, subtitle.language),
        eq(schema.cards.term, explained.term),
      ),
    )
    .get();
  if (existing) return { card: existing, created: false };

  const card = db
    .insert(schema.cards)
    .values({
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
    })
    .returning()
    .get();
  // A word you are making a card for is one you don't know yet.
  setKnown(db, user.id, subtitle.language, input.lemma ?? form, false);
  if (wordKey(explained.term) !== wordKey(input.lemma ?? form)) {
    setKnown(db, user.id, subtitle.language, explained.term, false);
  }
  return { card, created: true };
});
