import { defineEventHandler } from "h3";
import { previewIntervals } from "#shared/srs";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { studyQueue } from "~~/server/utils/cards";
import { mediaItemsOf } from "~~/server/utils/mediaItems";

/** The cards to study now, each with what its answer buttons would do and where it came from. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const now = Date.now();
  const { due, fresh } = studyQueue(db, user.id, user.learningLanguage, now);
  const cards = [...due, ...fresh];
  const sources = mediaItemsOf(db, cards);
  return {
    cards: cards.map((card) => {
      const source = card.mediaItemId ? sources.get(card.mediaItemId) : undefined;
      return {
        ...card,
        intervals: previewIntervals(card, now),
        source: source
          ? {
              serverItemId: source.serverItemId,
              kind: source.kind,
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
