import { inArray } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { cardsNotInAnki } from "~~/server/utils/cards";
import { sourceLabel } from "~~/server/utils/mediaItems";

/** Cards not yet sent to Anki, each with a label for where it came from. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const cards = cardsNotInAnki(db, user.id);
  const itemIds = [...new Set(cards.map((c) => c.mediaItemId).filter((id): id is number => id !== null))];
  const items = new Map(
    (itemIds.length
      ? db.select().from(schema.mediaItems).where(inArray(schema.mediaItems.id, itemIds)).all()
      : []
    ).map((item) => [item.id, item]),
  );
  return {
    cards: cards.map((c) => {
      const item = c.mediaItemId ? items.get(c.mediaItemId) : undefined;
      return {
        id: c.id,
        term: c.term,
        form: c.form,
        translation: c.translation,
        partOfSpeech: c.partOfSpeech,
        note: c.note,
        sentence: c.sentence,
        source: item ? sourceLabel(item) : "",
      };
    }),
  };
});
