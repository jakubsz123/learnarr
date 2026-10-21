import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";

const params = z.object({ id: z.coerce.number().int().positive() });

/** Take back the card's last review: its schedule goes back to what it was. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const db = useDb();
  const review = db
    .select()
    .from(schema.reviews)
    .where(and(eq(schema.reviews.cardId, id), eq(schema.reviews.userId, user.id)))
    .orderBy(desc(schema.reviews.reviewedAt), desc(schema.reviews.id))
    .get();
  if (!review?.previous) throw createError({ statusCode: 404, statusMessage: "There's no review to undo." });
  const { due, ...schedule } = review.previous;
  db.transaction((tx) => {
    tx.update(schema.cards)
      .set({ ...schedule, due: new Date(due), updatedAt: new Date() })
      .where(eq(schema.cards.id, id))
      .run();
    tx.delete(schema.reviews).where(eq(schema.reviews.id, review.id)).run();
  });
  return { undone: true };
});
