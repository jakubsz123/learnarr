import { and, count, eq, inArray } from "drizzle-orm";
import { schema, type Db } from "../db";
import { coverageOf } from "./subtitleWords";

export interface Progress {
  subtitleId: number;
  cards: number;
  /** "% you know", 0–1, or null before the subtitle is lemmatised. */
  coverage: number | null;
}

/** What the learner has done with each of these films or episodes, by media server item id. */
export async function progressOf(
  db: Db,
  user: { id: string; level: string; learningLanguage: string },
  server: "plex" | "jellyfin",
  serverItemIds: string[],
): Promise<Record<string, Progress>> {
  if (!serverItemIds.length) return {};
  const rows = db
    .select({
      serverItemId: schema.mediaItems.serverItemId,
      subtitleId: schema.subtitles.id,
      cards: count(schema.cards.id),
    })
    .from(schema.subtitles)
    .innerJoin(schema.mediaItems, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
    .leftJoin(schema.cards, eq(schema.cards.subtitleId, schema.subtitles.id))
    .where(
      and(
        eq(schema.subtitles.userId, user.id),
        eq(schema.subtitles.language, user.learningLanguage),
        eq(schema.mediaItems.server, server),
        inArray(schema.mediaItems.serverItemId, serverItemIds),
      ),
    )
    .groupBy(schema.subtitles.id)
    .all();
  const coverage = await coverageOf(
    db,
    user,
    user.learningLanguage,
    rows.map((r) => r.subtitleId),
  );
  return Object.fromEntries(
    rows.map((r) => [
      r.serverItemId,
      { subtitleId: r.subtitleId, cards: r.cards, coverage: coverage.get(r.subtitleId) ?? null },
    ]),
  );
}
