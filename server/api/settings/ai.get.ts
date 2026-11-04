import { defineEventHandler } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { useSettings } from "~~/server/utils/settings";

/** The household's AI provider. The key itself never leaves the server. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  return {
    provider: settings.get("ai.provider"),
    baseUrl: settings.get("ai.baseUrl"),
    model: settings.get("ai.model"),
    hasApiKey: Boolean(settings.get("ai.apiKey")),
    fromEnv: settings.isPinned("ai"),
  };
});
