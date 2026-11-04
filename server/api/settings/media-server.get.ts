import { defineEventHandler } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { useSettings } from "~~/server/utils/settings";

/** The household's media server. The token itself never leaves the server. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  return {
    kind: settings.get("media.kind"),
    url: settings.get("media.url"),
    name: settings.get("media.name"),
    hasToken: Boolean(settings.get("media.token")),
    fromEnv: settings.isPinned("media"),
  };
});
