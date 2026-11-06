import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireAdmin } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { createInvite } from "~~/server/utils/invites";
import { validBody } from "~~/server/utils/validate";

const body = z.object({ userId: z.string().min(1).max(100).optional() });

/**
 * Make a link for the admin to give someone: to create their account, or, with
 * `userId`, to choose a new password for one that exists. The link's token is
 * in the answer once; it can't be shown again.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event);
  const { userId } = await validBody(event, body);
  const db = useDb();
  if (userId && !db.select().from(schema.user).where(eq(schema.user.id, userId)).get())
    throw new AppError(404, "errors.users.notFound");
  return createInvite(db, admin.id, userId);
});
