import { useDb } from "~~/server/db";

/** Cards not yet sent to Anki, with where each came from. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return { cards: cardsNotInAnki(useDb(), user.id) };
});
