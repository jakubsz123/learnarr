import { defineEventHandler } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { useSettings } from "~~/server/utils/settings";

/** Remove this server's OpenSubtitles.com API key. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  if (settings.isPinned("opensubtitles")) throw new AppError(409, "errors.opensubtitles.keyFromEnv");
  settings.set("opensubtitles.apiKey", null);
  return { hasApiKey: false };
});
