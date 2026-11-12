import { defineEventHandler } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { useSettings } from "~~/server/utils/settings";

/** Whether this server has an OpenSubtitles.com API key. The key itself never leaves the server. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  return {
    hasApiKey: Boolean(settings.get("opensubtitles.apiKey")),
    fromEnv: settings.isPinned("opensubtitles"),
  };
});
