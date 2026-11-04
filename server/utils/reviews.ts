import { and, desc, eq } from "drizzle-orm";
import { schedule, type Rating } from "#shared/srs";
import { schema, type Db } from "../db";
import type { Card } from "./cards";
import { AppError } from "./errors";

function ownCard(db: Db, userId: string, cardId: number): Card {
  const card = db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, userId)))
    .get();
  if (!card) throw new AppError(404, "errors.cards.notFound");
  return card;
}

/** Record an answer and move the card to its next review. The old schedule is kept, for undo. */
export function reviewCard(db: Db, userId: string, cardId: number, rating: Rating, now = Date.now()) {
  const card = ownCard(db, userId, cardId);
  const next = schedule(card, rating, now);
  db.transaction((tx) => {
    tx.update(schema.cards)
      .set({ ...next, due: new Date(next.due), updatedAt: new Date(now) })
      .where(eq(schema.cards.id, cardId))
      .run();
    tx.insert(schema.reviews)
      .values({
        cardId,
        userId,
        rating,
        intervalDays: next.intervalDays,
        wasNew: card.state === "new",
        previous: {
          state: card.state,
          step: card.step,
          due: card.due.getTime(),
          intervalDays: card.intervalDays,
          ease: card.ease,
          reps: card.reps,
          lapses: card.lapses,
        },
        reviewedAt: new Date(now),
      })
      .run();
  });
  return { due: next.due, state: next.state };
}

/** Take back the card's last answer: its schedule goes back to what it was. */
export function undoReview(db: Db, userId: string, cardId: number) {
  ownCard(db, userId, cardId);
  const review = db
    .select()
    .from(schema.reviews)
    .where(and(eq(schema.reviews.cardId, cardId), eq(schema.reviews.userId, userId)))
    .orderBy(desc(schema.reviews.reviewedAt), desc(schema.reviews.id))
    .get();
  if (!review?.previous) throw new AppError(404, "errors.cards.nothingToUndo");
  const { due, ...previous } = review.previous;
  db.transaction((tx) => {
    tx.update(schema.cards)
      .set({ ...previous, due: new Date(due), updatedAt: new Date() })
      .where(eq(schema.cards.id, cardId))
      .run();
    tx.delete(schema.reviews).where(eq(schema.reviews.id, review.id)).run();
  });
}
