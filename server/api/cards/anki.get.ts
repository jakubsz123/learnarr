import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { cardsNotInAnki } from "~~/server/utils/cards";
import { mediaItemsOf } from "~~/server/utils/mediaItems";
import { mediaTitle } from "#shared/mediaLabels";

/** Cards not yet sent to Anki, each with a label for where it came from. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const cards = cardsNotInAnki(db, user.id, user.learningLanguage);
  const items = mediaItemsOf(db, cards);
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
        source: item ? mediaTitle(item) : "",
      };
    }),
  };
});
