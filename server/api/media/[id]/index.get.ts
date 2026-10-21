import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { useMediaServer } from "~~/server/utils/media";
import { candidateTracks } from "~~/server/utils/media/tracks";
import { MediaServerError } from "~~/server/utils/media/types";

const params = z.object({ id: z.string().min(1).max(100) });

/** A show, season, film or episode, with what this user has done with it. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const server = useMediaServer();
  try {
    const item = await server.item(id);
    const children = item.type === "show" || item.type === "season" ? await server.children(id) : [];

    const db = useDb();
    const local = db
      .select()
      .from(schema.mediaItems)
      .where(and(eq(schema.mediaItems.server, server.kind), eq(schema.mediaItems.serverItemId, id)))
      .get();
    const subtitle = local
      ? db
          .select({
            id: schema.subtitles.id,
            source: schema.subtitles.source,
            cueCount: schema.subtitles.cueCount,
            wordsPickedAt: schema.subtitles.wordsPickedAt,
          })
          .from(schema.subtitles)
          .where(
            and(
              eq(schema.subtitles.userId, user.id),
              eq(schema.subtitles.mediaItemId, local.id),
              eq(schema.subtitles.language, user.learningLanguage),
            ),
          )
          .get()
      : undefined;
    const cardCount = subtitle
      ? (db.select({ n: count() }).from(schema.cards).where(eq(schema.cards.subtitleId, subtitle.id)).get()
          ?.n ?? 0)
      : 0;

    return {
      item: { ...item, subtitleTracks: undefined },
      children,
      hasServerSubtitle: candidateTracks(item.subtitleTracks, user.learningLanguage).length > 0,
      subtitle: subtitle ?? null,
      cardCount,
    };
  } catch (error) {
    if (error instanceof MediaServerError) {
      throw createError({ statusCode: error.status === 404 ? 404 : 502, statusMessage: error.message });
    }
    throw error;
  }
});
