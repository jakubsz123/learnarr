import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { openSubtitlesSessions } from "~~/server/utils/opensubtitles";

/** Forget the person's OpenSubtitles.com account. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  useDb()
    .update(schema.user)
    .set({
      opensubtitlesUsername: null,
      opensubtitlesPassword: null,
      opensubtitlesApiKey: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, user.id))
    .run();
  openSubtitlesSessions.forget(user.id);
  return { connected: false };
});
