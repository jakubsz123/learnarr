import { defineEventHandler } from "h3";
import { requireAdmin } from "~~/server/utils/auth";
import { checkPlexPin, listPlexServers } from "~~/server/utils/media/plexAccount";
import { idParam, validParams } from "~~/server/utils/validate";

/** Once the person has approved the pin: their Plex servers, each with its own token. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { id } = validParams(event, idParam);
  const token = await checkPlexPin(id);
  if (!token) return { approved: false, servers: [] };
  return { approved: true, servers: await listPlexServers(token) };
});
