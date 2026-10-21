import { z } from "zod";
import { checkPlexPin, listPlexServers } from "~~/server/utils/media/plexAccount";
import { MediaServerError } from "~~/server/utils/media/types";

const params = z.object({ id: z.coerce.number().int().positive() });

/** Once the person has approved the pin: their Plex servers, each with its own token. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = validParams(event, params);
  try {
    const token = await checkPlexPin(id);
    if (!token) return { approved: false, servers: [] };
    return { approved: true, servers: await listPlexServers(token) };
  } catch (error) {
    if (error instanceof MediaServerError)
      throw createError({ statusCode: 502, statusMessage: error.message });
    throw error;
  }
});
