import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { mediaSourceFor } from "~~/server/utils/media";
import { candidateTracks } from "~~/server/utils/media/tracks";
import { nextEpisode, previousEpisode } from "~~/server/utils/media/types";
import { progressOf } from "~~/server/utils/progress";
import { mediaIdParam, validParams } from "~~/server/utils/validate";

/** A show, season, film or episode, with what this user has done with it and its episodes. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, mediaIdParam);
  const server = mediaSourceFor(id, user.id);
  const item = await server.item(id);
  const playable = item.type === "movie" || item.type === "episode";
  const [children, next, previous] = await Promise.all([
    playable ? [] : server.children(id),
    // The neighbouring episodes are a convenience; a failure finding them mustn't fail the page.
    nextEpisode(server, item).catch(() => null),
    previousEpisode(server, item).catch(() => null),
  ]);
  const progress = await progressOf(useDb(), user, server.kind, [
    id,
    ...children.filter((c) => c.type === "episode" || c.type === "movie").map((c) => c.id),
    ...(next ? [next.id] : []),
    ...(previous ? [previous.id] : []),
  ]);
  const { subtitleTracks, ...rest } = item;
  return {
    item: rest,
    children,
    next,
    previous,
    progress,
    hasServerSubtitle: candidateTracks(subtitleTracks, user.learningLanguage).length > 0,
  };
});
