import { eq } from "drizzle-orm";
import { z } from "zod";
import { schedule, type Rating } from "#shared/srs";
import { schema, useDb } from "~~/server/db";

const params = z.object({ id: z.coerce.number().int().positive() });
const body = z.object({ rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const { rating } = await validBody(event, body);
  const db = useDb();
  const card = db.select().from(schema.cards).where(eq(schema.cards.id, id)).get();
  if (!card || card.userId !== user.id)
    throw createError({ statusCode: 404, statusMessage: "No such card." });

  const now = Date.now();
  const next = schedule(card, rating as Rating, now);
  db.transaction((tx) => {
    tx.update(schema.cards)
      .set({ ...next, due: new Date(next.due), updatedAt: new Date(now) })
      .where(eq(schema.cards.id, id))
      .run();
    tx.insert(schema.reviews)
      .values({
        cardId: id,
        userId: user.id,
        rating,
        intervalDays: next.intervalDays,
        wasNew: card.state === "new",
        reviewedAt: new Date(now),
      })
      .run();
  });
  return { due: next.due, state: next.state };
});
