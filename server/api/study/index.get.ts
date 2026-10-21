import { inArray } from "drizzle-orm";
import { previewIntervals } from "#shared/srs";
import { schema, useDb } from "~~/server/db";

/** The cards to study now, each with what its answer buttons would do and where it came from. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const now = Date.now();
  const { due, fresh } = studyQueue(db, user.id, user.learningLanguage, now);
  const cards = [...due, ...fresh];
  const ids = [...new Set(cards.map((c) => c.mediaItemId).filter((id): id is number => id !== null))];
  const sources = new Map(
    (ids.length
      ? db.select().from(schema.mediaItems).where(inArray(schema.mediaItems.id, ids)).all()
      : []
    ).map((m) => [m.id, m]),
  );
  return {
    cards: cards.map((card) => {
      const source = card.mediaItemId ? sources.get(card.mediaItemId) : undefined;
      return {
        ...card,
        intervals: previewIntervals(card, now),
        source: source
          ? {
              serverItemId: source.serverItemId,
              title: source.title,
              showTitle: source.showTitle,
              seasonNumber: source.seasonNumber,
              episodeNumber: source.episodeNumber,
            }
          : null,
      };
    }),
    dueCount: due.length,
    newCount: fresh.length,
  };
});
