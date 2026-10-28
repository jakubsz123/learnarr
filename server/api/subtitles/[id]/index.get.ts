import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { useLemmas } from "~~/server/utils/lemmas";

const params = z.object({ id: z.coerce.number().int().positive() });

/** A subtitle with its lines, its words and how well the learner knows them, its cards and suggested words. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const db = useDb();
  const subtitle = ownSubtitle(db, user.id, id);
  const mediaItem = db
    .select()
    .from(schema.mediaItems)
    .where(eq(schema.mediaItems.id, subtitle.mediaItemId))
    .get();
  const cards = db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.subtitleId, id))
    .orderBy(asc(schema.cards.sentenceStartMs), asc(schema.cards.id))
    .all();
  const suggestions = db
    .select()
    .from(schema.suggestions)
    .where(eq(schema.suggestions.subtitleId, id))
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
    lemmas: useLemmas().status(subtitle),
    cards,
    suggestions,
  };
});
