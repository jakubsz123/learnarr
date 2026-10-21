import { z } from "zod";
import { useDb } from "~~/server/db";
import { useMediaServer } from "~~/server/utils/media";
import { candidateTracks } from "~~/server/utils/media/tracks";
import { MediaServerError, nextEpisode } from "~~/server/utils/media/types";

const params = z.object({ id: z.string().min(1).max(100) });

/** A show, season, film or episode, with what this user has done with it and its episodes. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const server = useMediaServer();
  try {
    const item = await server.item(id);
    const playable = item.type === "movie" || item.type === "episode";
    const [children, next] = await Promise.all([
      playable ? [] : server.children(id),
      nextEpisode(server, item).catch(() => null),
    ]);
    const progress = await progressOf(useDb(), user, server.kind, [
      id,
      ...children.filter((c) => c.type === "episode" || c.type === "movie").map((c) => c.id),
      ...(next ? [next.id] : []),
    ]);
    const { subtitleTracks, ...rest } = item;
    return {
      item: rest,
      children,
      next,
      progress,
      hasServerSubtitle: candidateTracks(subtitleTracks, user.learningLanguage).length > 0,
    };
  } catch (error) {
    if (error instanceof MediaServerError) {
      throw createError({ statusCode: error.status === 404 ? 404 : 502, statusMessage: error.message });
    }
    throw error;
  }
});
