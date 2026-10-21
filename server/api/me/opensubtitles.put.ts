import { eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";

const body = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

/** Check the account with OpenSubtitles.com, then keep it, password encrypted. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { username, password } = await validBody(event, body);
  let account;
  try {
    ({ account } = await login(username, password));
  } catch (error) {
    if (error instanceof OpenSubtitlesError)
      throw createError({ statusCode: error.status, statusMessage: error.message });
    throw error;
  }
  useDb()
    .update(schema.user)
    .set({
      opensubtitlesUsername: username,
      opensubtitlesPassword: encryptSecret(password),
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, user.id))
    .run();
  openSubtitlesSessions.forget(user.id);
  return { connected: true, username, allowedDownloads: account.allowedDownloads, vip: account.vip };
});
