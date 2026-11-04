import { defineEventHandler, getRequestURL } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { useSettings } from "~~/server/utils/settings";
import { webhookSecret } from "~~/server/utils/webhooks";

/** The addresses to paste into Plex or Jellyfin, so plays can trigger "before you watch" notifications. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const base = process.env.PUBLIC_URL?.replace(/\/+$/, "") || getRequestURL(event).origin;
  const secret = webhookSecret(useSettings());
  return {
    plex: `${base}/api/webhooks/plex/${secret}`,
    jellyfin: `${base}/api/webhooks/jellyfin/${secret}`,
  };
});
