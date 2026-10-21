import { inArray } from "drizzle-orm";
import { schema, useDb } from "~~/server/db";

/** Cards not yet sent to Anki, each with a label for where it came from. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const cards = cardsNotInAnki(db, user.id);
  const itemIds = [...new Set(cards.map((c) => c.mediaItemId).filter((id): id is number => id !== null))];
  const items = itemIds.length
    ? db.select().from(schema.mediaItems).where(inArray(schema.mediaItems.id, itemIds)).all()
    : [];
  const label = new Map(
    items.map((i) => [
      i.id,
      i.kind === "episode"
        ? `${i.showTitle ?? i.title} S${i.seasonNumber ?? "?"}E${i.episodeNumber ?? "?"}`
        : i.title,
    ]),
  );
  return {
    cards: cards.map((c) => ({
      id: c.id,
      term: c.term,
      form: c.form,
      translation: c.translation,
      partOfSpeech: c.partOfSpeech,
      note: c.note,
      sentence: c.sentence,
      source: c.mediaItemId ? (label.get(c.mediaItemId) ?? "") : "",
    })),
  };
});
