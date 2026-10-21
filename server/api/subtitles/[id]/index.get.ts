import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { parseSubtitle } from "#shared/subtitles";
import { schema, useDb } from "~~/server/db";

const params = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const db = useDb();
  const subtitle = db.select().from(schema.subtitles).where(eq(schema.subtitles.id, id)).get();
  if (!subtitle || subtitle.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: "That subtitle isn't in your library." });
  }
  const mediaItem = db
    .select()
    .from(schema.mediaItems)
    .where(eq(schema.mediaItems.id, subtitle.mediaItemId))
    .get();
  const cards = db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.subtitleId, id))
    .orderBy(asc(schema.cards.sentenceStartMs))
    .all();
  const { content, ...meta } = subtitle;
  return { subtitle: meta, mediaItem, cues: parseSubtitle(content), cards };
});
