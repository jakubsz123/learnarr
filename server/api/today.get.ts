import { and, count, desc, eq, sql } from "drizzle-orm";
import { schema, useDb } from "~~/server/db";

/** Everything the Today page shows: what's due, how it's going and what you were watching. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const language = user.learningLanguage;
  await seedKnownWords(db, user, language);
  const queue = studyQueue(db, user.id, language);

  const recent = db
    .select({
      subtitleId: schema.subtitles.id,
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
    .where(and(eq(schema.subtitles.userId, user.id), eq(schema.subtitles.language, language)))
    .groupBy(schema.subtitles.id)
    .orderBy(desc(sql`max(${schema.subtitles.updatedAt}, coalesce(max(${schema.cards.updatedAt}), 0))`))
    .limit(8)
    .all();
  const coverage = await coverageOf(
    db,
    user,
    language,
    recent.map((r) => r.subtitleId),
  );

  return {
    due: queue.due.length,
    fresh: queue.fresh.length,
    stats: learningStats(db, user.id, language),
    recent: recent.map((r) => ({ ...r, coverage: coverage.get(r.subtitleId) ?? null })),
  };
});
