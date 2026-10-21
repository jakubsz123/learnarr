import { and, desc, eq, like, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";

const query = z.object({
  search: z.string().trim().max(100).optional(),
  filter: z.enum(["all", "new", "learning", "review", "suspended"]).default("all"),
});

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
  const db = useDb();
  const cards = db
    .select({
      card: schema.cards,
      title: schema.mediaItems.title,
      showTitle: schema.mediaItems.showTitle,
      seasonNumber: schema.mediaItems.seasonNumber,
      episodeNumber: schema.mediaItems.episodeNumber,
    })
    .from(schema.cards)
    .leftJoin(schema.mediaItems, eq(schema.cards.mediaItemId, schema.mediaItems.id))
    .where(and(...conditions))
    .orderBy(desc(schema.cards.createdAt), desc(schema.cards.id))
    .limit(500)
    .all();
  return {
    cards: cards.map(({ card, ...source }) => ({ ...card, source: source.title ? source : null })),
  };
});
