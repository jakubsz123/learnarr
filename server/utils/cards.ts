import { and, asc, count, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { schema, type Db } from "../db";

export type Card = typeof schema.cards.$inferSelect;

/** New cards introduced per day, so a big episode doesn't bury the reviews. */
export const NEW_CARDS_PER_DAY = 20;

export function knownTerms(db: Db, userId: string, language: string): string[] {
  return db
    .select({ term: schema.cards.term })
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, userId), eq(schema.cards.language, language)))
    .all()
    .map((r) => r.term);
}

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** New cards already introduced today: reviews of cards that had only that one review then. */
function newIntroducedToday(db: Db, userId: string, now: number): number {
  return (
    db
      .select({ n: count() })
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.userId, userId),
          gte(schema.reviews.reviewedAt, new Date(startOfDay(now))),
          eq(schema.reviews.wasNew, true),
        ),
      )
      .get()?.n ?? 0
  );
}

/** What to study now: due learning and review cards, then today's share of new ones. */
export function studyQueue(db: Db, userId: string, language: string, now = Date.now()) {
  const base = and(
    eq(schema.cards.userId, userId),
    eq(schema.cards.language, language),
    eq(schema.cards.suspended, false),
  );
  const due = db
    .select()
    .from(schema.cards)
    .where(and(base, sql`${schema.cards.state} != 'new'`, lte(schema.cards.due, new Date(now))))
    .orderBy(asc(schema.cards.due))
    .all();
  const newLimit = Math.max(0, NEW_CARDS_PER_DAY - newIntroducedToday(db, userId, now));
  const fresh = newLimit
    ? db
        .select()
        .from(schema.cards)
        .where(and(base, eq(schema.cards.state, "new")))
        .orderBy(asc(schema.cards.createdAt), asc(schema.cards.id))
        .limit(newLimit)
        .all()
    : [];
  return { due, fresh, total: due.length + fresh.length };
}

export function cardsNotInAnki(db: Db, userId: string): Card[] {
  return db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, userId), isNull(schema.cards.ankiNoteId)))
    .orderBy(asc(schema.cards.id))
    .all();
}
