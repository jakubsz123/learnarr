import { createPlexPin } from "~~/server/utils/media/plexAccount";
import { MediaServerError } from "~~/server/utils/media/types";

/** Start "Sign in with Plex": the browser opens authUrl, then polls the pin. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  try {
    return await createPlexPin();
  } catch (error) {
    if (error instanceof MediaServerError)
      throw createError({ statusCode: 502, statusMessage: error.message });
    throw error;
  }
});
