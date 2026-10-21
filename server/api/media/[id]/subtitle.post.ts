import { z } from "zod";
import { useDb } from "~~/server/db";
import { useMediaServer } from "~~/server/utils/media";
import { MediaServerError } from "~~/server/utils/media/types";

const params = z.object({ id: z.string().min(1).max(100) });

/** Get this film or episode's subtitle in the user's learning language. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  try {
    const subtitle = await getSubtitle({ db: useDb(), server: useMediaServer(), user, serverItemId: id });
    return { id: subtitle.id, source: subtitle.source, cueCount: subtitle.cueCount };
  } catch (error) {
    if (error instanceof MediaServerError)
      throw createError({ statusCode: 502, statusMessage: error.message });
    throw error;
  }
});
