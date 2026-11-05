import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { mediaServerSettings, useMediaServer } from "~~/server/utils/media";
import { useCatalogue } from "~~/server/utils/media/catalogue";
import { nextEpisode, type MediaServer, type MediaSummary } from "~~/server/utils/media/types";
import { recentItems } from "~~/server/utils/mediaItems";
import { progressOf } from "~~/server/utils/progress";
import { useSettings } from "~~/server/utils/settings";

const SHOWS = 4;

/**
 * The episode after the furthest one you've studied, for each of your recent
 * shows, on the media server or from OpenSubtitles.com's catalogue. Separate
 * from Today because it asks them, which can be slow.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const sources: MediaServer[] = [
    ...(mediaServerSettings(useSettings()) ? [useMediaServer()] : []),
    useCatalogue(),
  ];
  const sourceOf = (kind: string) => sources.find((s) => s.kind === kind);

  type Row = ReturnType<typeof recentItems>[number];
  const place = (row: Row) => (row.seasonNumber ?? 0) * 10_000 + (row.episodeNumber ?? 0);
  const furthest = new Map<string, Row>();
  for (const row of recentItems(db, user.id, user.learningLanguage, 200)) {
    if (!sourceOf(row.server) || row.kind !== "episode" || !row.showTitle) continue;
    const key = `${row.server}:${row.showTitle}`;
    const best = furthest.get(key);
    if (!best || place(row) > place(best)) furthest.set(key, row);
  }

  const found = await Promise.all(
    [...furthest.values()].slice(0, SHOWS * 2).map(async (row) => {
      const source = sourceOf(row.server)!;
      // A show that's gone from the server, or a hiccup, just leaves it out.
      const item = await source.item(row.serverItemId).catch(() => null);
      const next = item ? await nextEpisode(source, item).catch(() => null) : null;
      return next ? { next, kind: source.kind } : null;
    }),
  );
  const items: MediaSummary[] = [];
  for (const source of sources) {
    const mine = found.flatMap((f) => (f && f.kind === source.kind ? [f.next] : []));
    const progress = await progressOf(
      db,
      user,
      source.kind,
      mine.map((i) => i.id),
    );
    items.push(...mine.filter((i) => !progress[i.id]));
  }
  return { items: items.slice(0, SHOWS) };
});
