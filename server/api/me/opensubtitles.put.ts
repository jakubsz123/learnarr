import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import {
  checkApiKey,
  openSubtitlesLogin,
  openSubtitlesSessions,
  sharedApiKey,
} from "~~/server/utils/opensubtitles";
import { encryptSecret } from "~~/server/utils/secrets";
import { validBody } from "~~/server/utils/validate";

const body = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
  /** The person's own API key; optional only when the admin shares one. */
  apiKey: z.string().trim().min(8).max(200).optional(),
});

/** Check the account and API key with OpenSubtitles.com, then keep them, encrypted. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { username, password, apiKey } = await validBody(event, body);
  const key = apiKey ?? sharedApiKey();
  if (!key) throw new AppError(400, "errors.opensubtitles.needApiKey");
  if (apiKey) await checkApiKey(apiKey);
  const { account } = await openSubtitlesLogin(key, username, password);
  useDb()
    .update(schema.user)
    .set({
      opensubtitlesUsername: username,
      opensubtitlesPassword: encryptSecret(password),
      opensubtitlesApiKey: apiKey ? encryptSecret(apiKey) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, user.id))
    .run();
  openSubtitlesSessions.forget(user.id);
  return { connected: true, username, allowedDownloads: account.allowedDownloads, vip: account.vip };
});
