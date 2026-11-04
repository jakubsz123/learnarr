import { defineEventHandler } from "h3";
import { z } from "zod";
import { LANGUAGE_CODES } from "#shared/languages";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { define } from "~~/server/utils/dictionary";
import { validQuery } from "~~/server/utils/validate";

const query = z.object({
  language: z.enum(LANGUAGE_CODES),
  /** The dictionary form first, then the form used, comma-separated. */
  words: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .transform((s) => s.split(",").filter(Boolean).slice(0, 3)),
});

/** A word's definitions from Wiktionary, for the word sheet. */
export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { language, words } = validQuery(event, query);
  const found = await define(useDb(), language, words);
  return { reached: found !== null, word: found?.word ?? words[0], entries: found?.entries ?? [] };
});
