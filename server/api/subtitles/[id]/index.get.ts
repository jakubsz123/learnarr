import { and, asc, eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { useLemmas } from "~~/server/utils/lemmas";
import { ownSubtitle } from "~~/server/utils/ownSubtitle";
import { subtitleTranscript } from "~~/server/utils/subtitleWords";
import { idParam, validParams } from "~~/server/utils/validate";

/** A subtitle with its lines, its words and how well the learner knows them, its cards and suggested words. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  const db = useDb();
  const subtitle = ownSubtitle(db, user.id, id);
  const lemmas = useLemmas();
  lemmas.ensure(subtitle);
  const mediaItem = db
    .select()
    .from(schema.mediaItems)
    .where(eq(schema.mediaItems.id, subtitle.mediaItemId))
    .get();
  const cards = db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.subtitleId, id), eq(schema.cards.userId, user.id)))
    .orderBy(asc(schema.cards.sentenceStartMs), asc(schema.cards.id))
    .all();
  const suggestions = db
    .select()
    .from(schema.suggestions)
    .where(and(eq(schema.suggestions.subtitleId, id), eq(schema.suggestions.userId, user.id)))
    .orderBy(asc(schema.suggestions.sentenceStartMs), asc(schema.suggestions.id))
    .all();
  const { cues, transcript, coverage } = await subtitleTranscript(db, user, subtitle);
  const { content: _content, ...meta } = subtitle;
  return {
    subtitle: meta,
    mediaItem,
    cues,
    transcript,
    coverage,
    lemmas: lemmas.status(subtitle),
    cards,
    suggestions,
  };
});
