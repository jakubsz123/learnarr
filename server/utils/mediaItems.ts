import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { schema, type Db } from "../db";

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

/** The media items of these cards (or anything with a mediaItemId), by id: to say where each is from. */
export function mediaItemsOf(db: Db, rows: { mediaItemId: number | null }[]) {
  const ids = [...new Set(rows.map((r) => r.mediaItemId).filter((id): id is number => id !== null))];
  const items = ids.length
    ? db.select().from(schema.mediaItems).where(inArray(schema.mediaItems.id, ids)).all()
    : [];
  return new Map(items.map((item) => [item.id, item]));
}
