import { and, count, desc, eq, sql } from "drizzle-orm";
import { schema, useDb } from "~~/server/db";

/** The films and episodes this user has subtitles for, most recent first. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const rows = db
    .select({
      subtitleId: schema.subtitles.id,
      serverItemId: schema.mediaItems.serverItemId,
      kind: schema.mediaItems.kind,
      title: schema.mediaItems.title,
      showTitle: schema.mediaItems.showTitle,
      seasonNumber: schema.mediaItems.seasonNumber,
      episodeNumber: schema.mediaItems.episodeNumber,
      cards: count(schema.cards.id),
      updatedAt: schema.subtitles.updatedAt,
    })
    .from(schema.subtitles)
    .innerJoin(schema.mediaItems, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
    .leftJoin(schema.cards, eq(schema.cards.subtitleId, schema.subtitles.id))
    .where(and(eq(schema.subtitles.userId, user.id), eq(schema.subtitles.language, user.learningLanguage)))
    .groupBy(schema.subtitles.id)
    .orderBy(desc(sql`max(${schema.subtitles.updatedAt}, coalesce(max(${schema.cards.updatedAt}), 0))`))
    .limit(12)
    .all();
  return { items: rows };
});
