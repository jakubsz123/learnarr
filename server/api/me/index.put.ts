import { eq } from "drizzle-orm";
import { z } from "zod";
import { LANGUAGE_CODES, LEVELS } from "#shared/languages";
import { schema, useDb } from "~~/server/db";

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
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const changes = await validBody(event, body);
  useDb()
    .update(schema.user)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(schema.user.id, user.id))
    .run();
  return { saved: true };
});
