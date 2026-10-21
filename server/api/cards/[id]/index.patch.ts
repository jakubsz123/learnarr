import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";

const params = z.object({ id: z.coerce.number().int().positive() });
const body = z.object({
  translation: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().max(200).nullable().optional(),
  suspended: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const changes = await validBody(event, body);
  const result = useDb()
    .update(schema.cards)
    .set({ ...changes, updatedAt: new Date() })
    .where(eq(schema.cards.id, id))
    .returning()
    .get();
  if (!result || result.userId !== user.id)
    throw createError({ statusCode: 404, statusMessage: "No such card." });
  return result;
});
