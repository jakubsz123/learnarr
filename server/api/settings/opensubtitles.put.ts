import { defineEventHandler } from "h3";
import { z } from "zod";
import { requireAdmin } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { checkApiKey } from "~~/server/utils/opensubtitles";
import { useSettings } from "~~/server/utils/settings";
import { validBody } from "~~/server/utils/validate";

const body = z.object({ apiKey: z.string().trim().min(8).max(200) });

/** Save this server's OpenSubtitles.com API key. Nothing is saved unless OpenSubtitles.com accepts it. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  if (settings.isPinned("opensubtitles")) throw new AppError(409, "errors.opensubtitles.keyFromEnv");
  const { apiKey } = await validBody(event, body);
  await checkApiKey(apiKey);
  settings.set("opensubtitles.apiKey", apiKey);
  return { hasApiKey: true };
});
