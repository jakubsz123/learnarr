import { and, eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { idParam, validBody, validParams } from "~~/server/utils/validate";

const body = z.object({
  translation: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().max(200).nullable().optional(),
  suspended: z.boolean().optional(),
});

/** Correct a card's translation or note, or suspend it. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  const changes = await validBody(event, body);
  const card = useDb()
    .update(schema.cards)
    .set({ ...changes, updatedAt: new Date() })
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)))
    .returning()
    .get();
  if (!card) throw new AppError(404, "errors.cards.notFound");
  return card;
});
