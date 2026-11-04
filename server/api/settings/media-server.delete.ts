import { defineEventHandler } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { SETTING_GROUPS, useSettings } from "~~/server/utils/settings";

/** Disconnect the media server. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  for (const key of SETTING_GROUPS.media) settings.set(key, null);
  return { removed: true };
});
