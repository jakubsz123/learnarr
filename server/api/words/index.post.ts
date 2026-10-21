import { z } from "zod";
import { LANGUAGE_CODES } from "#shared/languages";
import { useDb } from "~~/server/db";

const body = z.object({
  word: z.string().trim().min(1).max(80),
  known: z.boolean(),
  language: z.enum(LANGUAGE_CODES).optional(),
});

/** Mark a word as known, or not. Defaults to the language the user is learning. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { word, known, language } = await validBody(event, body);
  setKnown(useDb(), user.id, language ?? user.learningLanguage, word, known);
  return { word, known };
});
