import { and, desc, eq, like, or, type SQL } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { CARD_FILTERS } from "#shared/srs";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { validQuery } from "~~/server/utils/validate";

const query = z.object({
  search: z.string().trim().max(100).optional(),
  filter: z.enum(CARD_FILTERS).default("all"),
});

/** The learner's cards in the language they're learning, newest first, searchable. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { search, filter } = validQuery(event, query);
  const conditions: SQL[] = [
    eq(schema.cards.userId, user.id),
    eq(schema.cards.language, user.learningLanguage),
  ];
  if (filter === "suspended") conditions.push(eq(schema.cards.suspended, true));
  else if (filter !== "all")
    conditions.push(eq(schema.cards.state, filter), eq(schema.cards.suspended, false));
  if (search) {
    const pattern = `%${search.replace(/[%_]/g, "")}%`;
    conditions.push(or(like(schema.cards.term, pattern), like(schema.cards.translation, pattern))!);
  }
  const rows = useDb()
    .select({
      card: schema.cards,
      source: {
        serverItemId: schema.mediaItems.serverItemId,
        kind: schema.mediaItems.kind,
        title: schema.mediaItems.title,
        showTitle: schema.mediaItems.showTitle,
        seasonNumber: schema.mediaItems.seasonNumber,
        episodeNumber: schema.mediaItems.episodeNumber,
      },
    })
    .from(schema.cards)
    .leftJoin(schema.mediaItems, eq(schema.cards.mediaItemId, schema.mediaItems.id))
    .where(and(...conditions))
    .orderBy(desc(schema.cards.createdAt), desc(schema.cards.id))
    .limit(500)
    .all();
  return { cards: rows.map(({ card, source }) => ({ ...card, source })) };
});
