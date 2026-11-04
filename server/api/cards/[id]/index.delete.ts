import { and, eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { idParam, validParams } from "~~/server/utils/validate";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  const result = useDb()
    .delete(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)))
    .run();
  if (!result.changes) throw new AppError(404, "errors.cards.notFound");
  return { deleted: true };
});
