import { useDb } from "~~/server/db";

/** The words the user has marked as known in the language they're learning. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return { words: markedWords(useDb(), user.id, user.learningLanguage) };
});
