import { and, count, desc, eq, like } from "drizzle-orm";
import { UPLOADS_LIBRARY } from "#shared/mediaSources";
import { schema, type Db } from "../../db";
import { MediaServerError, type MediaDetail, type MediaServer } from "./types";

const notFound = () => new MediaServerError("errors.media.noItem", { server: "Learnarr" }, 404);

/**
 * Subtitles people uploaded on their own, for something that isn't on the
 * media server or in OpenSubtitles.com's catalogue. Each is a film-like item
 * with the title the person gave it, seen only by them. Its subtitle is saved
 * when it's uploaded, so there is nothing to fetch.
 */
export function createUploads(db: Db, userId: string): MediaServer {
  const mine = and(eq(schema.mediaItems.server, "upload"), eq(schema.subtitles.userId, userId));

  return {
    kind: "upload",

    async identify() {
      return { name: "Learnarr", version: "" };
    },

    async libraries() {
      return [{ id: UPLOADS_LIBRARY, name: "Your uploads", type: "uploads" }];
    },

    async items(_libraryId, { start, limit, search }) {
      const where = search ? and(mine, like(schema.mediaItems.title, `%${search}%`)) : mine;
      const rows = db
        .select({ item: schema.mediaItems })
        .from(schema.mediaItems)
        .innerJoin(schema.subtitles, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
        .where(where)
        .orderBy(desc(schema.mediaItems.createdAt), desc(schema.mediaItems.id))
        .limit(limit)
        .offset(start)
        .all();
      const total =
        db
          .select({ n: count() })
          .from(schema.mediaItems)
          .innerJoin(schema.subtitles, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
          .where(where)
          .get()?.n ?? 0;
      return {
        items: rows.map(({ item }) => ({
          id: item.serverItemId,
          type: "movie" as const,
          title: item.title,
          hasPoster: false,
        })),
        total,
      };
    },

    async children() {
      return [];
    },

    async item(id): Promise<MediaDetail> {
      const row = db
        .select({ item: schema.mediaItems })
        .from(schema.mediaItems)
        .innerJoin(schema.subtitles, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
        .where(and(mine, eq(schema.mediaItems.serverItemId, id)))
        .get();
      if (!row) throw notFound();
      return { id, type: "movie", title: row.item.title, hasPoster: false, subtitleTracks: [] };
    },

    async poster() {
      throw notFound();
    },

    async subtitle() {
      return null;
    },
  };
}
