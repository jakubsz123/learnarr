import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { LANGUAGE_CODES, LEVELS } from "#shared/languages";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { useLemmas } from "~~/server/utils/lemmas";
import { validBody } from "~~/server/utils/validate";

const body = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  learningLanguage: z.enum(LANGUAGE_CODES).optional(),
  nativeLanguage: z.enum(LANGUAGE_CODES).optional(),
  level: z.enum(LEVELS).optional(),
  ankiUrl: z
    .url({ protocol: /^https?$/ })
    .max(200)
    .optional(),
  ankiDeck: z.string().trim().min(1).max(100).optional(),
  /** Set when the person finishes their first-sign-in questions. */
  onboarded: z.literal(true).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { onboarded, ...changes } = await validBody(event, body);
  useDb()
    .update(schema.user)
    .set({ ...changes, ...(onboarded ? { onboardedAt: new Date() } : {}), updatedAt: new Date() })
    .where(eq(schema.user.id, user.id))
    .run();
  // Fetch the new language's lemmatiser model now, so the first episode doesn't wait for it.
  if (changes.learningLanguage) useLemmas().prepare(changes.learningLanguage);
  return { saved: true };
});
