import { and, count, desc, eq, sql } from "drizzle-orm";
import { schema, type Db } from "../db";

type MediaItem = Pick<
  typeof schema.mediaItems.$inferSelect,
  "kind" | "title" | "showTitle" | "seasonNumber" | "episodeNumber"
>;

/** "Show S1 E2" for an episode, the title for a film: how a card says where it came from, outside the app. */
export function sourceLabel(item: MediaItem): string {
  if (item.kind !== "episode") return item.title;
  return `${item.showTitle ?? item.title} S${item.seasonNumber ?? "?"} E${item.episodeNumber ?? "?"}`;
}

/**
 * The films and episodes a learner has a subtitle for in a language, most
 * recently worked on first (a new card counts as work on its episode).
 */
export function recentItems(db: Db, userId: string, language: string, limit: number) {
  return db
    .select({
      subtitleId: schema.subtitles.id,
      server: schema.mediaItems.server,
      serverItemId: schema.mediaItems.serverItemId,
      kind: schema.mediaItems.kind,
      title: schema.mediaItems.title,
      showTitle: schema.mediaItems.showTitle,
      seasonNumber: schema.mediaItems.seasonNumber,
      episodeNumber: schema.mediaItems.episodeNumber,
      cards: count(schema.cards.id),
    })
    .from(schema.subtitles)
    .innerJoin(schema.mediaItems, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
    .leftJoin(schema.cards, eq(schema.cards.subtitleId, schema.subtitles.id))
    .where(and(eq(schema.subtitles.userId, userId), eq(schema.subtitles.language, language)))
    .groupBy(schema.subtitles.id)
    .orderBy(desc(sql`max(${schema.subtitles.updatedAt}, coalesce(max(${schema.cards.updatedAt}), 0))`))
    .limit(limit)
    .all();
}
