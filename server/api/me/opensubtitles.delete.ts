import { eq } from "drizzle-orm";
import { schema, useDb } from "~~/server/db";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  useDb()
    .update(schema.user)
    .set({ opensubtitlesUsername: null, opensubtitlesPassword: null, updatedAt: new Date() })
    .where(eq(schema.user.id, user.id))
    .run();
  openSubtitlesSessions.forget(user.id);
  return { connected: false };
});
