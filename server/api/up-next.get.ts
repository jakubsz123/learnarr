import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { mediaServerSettings, useMediaServer } from "~~/server/utils/media";
import { nextEpisode, type MediaSummary } from "~~/server/utils/media/types";
import { recentItems } from "~~/server/utils/mediaItems";
import { progressOf } from "~~/server/utils/progress";
import { useSettings } from "~~/server/utils/settings";

const SHOWS = 4;

/**
 * The episode after the furthest one you've studied, for each of your recent
 * shows. Separate from Today because it asks the media server, which can be slow.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  if (!mediaServerSettings(useSettings())) return { items: [] };
  const db = useDb();
  const server = useMediaServer();

  type Row = ReturnType<typeof recentItems>[number];
  const place = (row: Row) => (row.seasonNumber ?? 0) * 10_000 + (row.episodeNumber ?? 0);
  const furthest = new Map<string, Row>();
  for (const row of recentItems(db, user.id, user.learningLanguage, 200)) {
    if (row.server !== server.kind || row.kind !== "episode" || !row.showTitle) continue;
    const best = furthest.get(row.showTitle);
    if (!best || place(row) > place(best)) furthest.set(row.showTitle, row);
  }

  const found = await Promise.all(
    [...furthest.values()].slice(0, SHOWS * 2).map(async (row) => {
      // A show that's gone from the server, or a hiccup, just leaves it out.
      const item = await server.item(row.serverItemId).catch(() => null);
      return item ? nextEpisode(server, item).catch(() => null) : null;
    }),
  );
  const items = found.filter((n): n is MediaSummary => n !== null);
  const progress = await progressOf(
    db,
    user,
    server.kind,
    items.map((i) => i.id),
  );
  return { items: items.filter((i) => !progress[i.id]).slice(0, SHOWS) };
});
