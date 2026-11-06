import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireAdmin } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { validParams } from "~~/server/utils/validate";

const params = z.object({ id: z.string().min(1).max(100) });

/** Cancel a link, so it stops working. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = validParams(event, params);
  const result = useDb().delete(schema.invites).where(eq(schema.invites.id, id)).run();
  if (!result.changes) throw new AppError(404, "errors.invites.invalid");
  return { deleted: true };
});
