import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const result = useDb()
    .delete(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)))
    .run();
  if (!result.changes) throw createError({ statusCode: 404, statusMessage: "No such card." });
  return { deleted: true };
});
