import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireAdmin } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { validParams } from "~~/server/utils/validate";

const params = z.object({ id: z.string().min(1).max(100) });

/** Remove a household member and everything that is theirs. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const { id } = validParams(event, params);
  if (id === admin.id) throw new AppError(400, "errors.users.notYourself");
  const result = useDb().delete(schema.user).where(eq(schema.user.id, id)).run();
  if (!result.changes) throw new AppError(404, "errors.users.notFound");
  return { deleted: true };
});
