import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import {
  openSubtitlesLogin,
  openSubtitlesSessions,
  requireOpenSubtitlesApiKey,
} from "~~/server/utils/opensubtitles";
import { encryptSecret } from "~~/server/utils/secrets";
import { validBody } from "~~/server/utils/validate";

const body = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

/** Check the account with OpenSubtitles.com, then keep it, password encrypted. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { username, password } = await validBody(event, body);
  const { account } = await openSubtitlesLogin(requireOpenSubtitlesApiKey(), username, password);
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
