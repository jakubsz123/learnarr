import { and, desc, eq, isNotNull } from "drizzle-orm";
import { schema, useDb } from "~~/server/db";
import { useMediaServer } from "~~/server/utils/media";
import { nextEpisode, type MediaSummary } from "~~/server/utils/media/types";

const SHOWS = 4;

/**
 * The episode after the latest one you studied, for each of your recent shows.
 * Separate from Today because it asks the media server, which can be slow.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  let server;
  try {
    server = useMediaServer();
  } catch {
    return { items: [] };
  }
  const latest = db
    .select({
      serverItemId: schema.mediaItems.serverItemId,
      showTitle: schema.mediaItems.showTitle,
      seasonNumber: schema.mediaItems.seasonNumber,
      episodeNumber: schema.mediaItems.episodeNumber,
    })
    .from(schema.subtitles)
    .innerJoin(schema.mediaItems, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
    .where(
      and(
        eq(schema.subtitles.userId, user.id),
        eq(schema.subtitles.language, user.learningLanguage),
        eq(schema.mediaItems.server, server.kind),
        isNotNull(schema.mediaItems.showTitle),
      ),
    )
    .orderBy(desc(schema.subtitles.updatedAt))
    .all();

  // The furthest episode of each show, shows touched most recently first.
  const place = (row: (typeof latest)[number]) => (row.seasonNumber ?? 0) * 10_000 + (row.episodeNumber ?? 0);
  const furthest = new Map<string, (typeof latest)[number]>();
  for (const row of latest) {
    const best = furthest.get(row.showTitle!);
    if (!best || place(row) > place(best)) furthest.set(row.showTitle!, row);
  }
  const candidates = [...furthest.values()].slice(0, SHOWS * 2).map((row) => row.serverItemId);

  const found = await Promise.all(
    candidates.map(async (id) => {
      const item = await server.item(id).catch(() => null);
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
