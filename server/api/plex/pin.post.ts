import { defineEventHandler } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { createPlexPin } from "~~/server/utils/media/plexAccount";

/** Start "Sign in with Plex": the browser opens authUrl, then polls the pin. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return createPlexPin();
});
