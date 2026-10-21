import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";

const params = z.object({ id: z.string().min(1).max(100) });

/** Remove a household member and everything that is theirs. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const { id } = validParams(event, params);
  if (id === admin.id)
    throw createError({ statusCode: 400, statusMessage: "You can't delete your own account." });
  const result = useDb().delete(schema.user).where(eq(schema.user.id, id)).run();
  if (!result.changes) throw createError({ statusCode: 404, statusMessage: "No such user." });
  return { deleted: true };
});
