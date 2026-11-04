import { and, count, eq, gte, sql } from "drizzle-orm";
import { dayNumber, startOfDay } from "#shared/days";
import { schema, type Db } from "../db";
import { MATURE_DAYS } from "#shared/srs";

const DAY = 24 * 60 * 60 * 1000;

/** Days in a row with at least one review, ending today (or yesterday, if today has none yet). */
export function reviewStreak(db: Db, userId: string, now = Date.now()): number {
  const days = new Set(
    db
      .select({ at: schema.reviews.reviewedAt })
      .from(schema.reviews)
      .where(
        and(eq(schema.reviews.userId, userId), gte(schema.reviews.reviewedAt, new Date(now - 400 * DAY))),
      )
      .all()
      .map((r) => dayNumber(r.at.getTime())),
  );
  let day = dayNumber(now);
  if (!days.has(day)) day--;
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day--;
  }
  return streak;
}

/** Counts for the Today page, in the language the user is learning. */
export function learningStats(db: Db, userId: string, language: string, now = Date.now()) {
  const cards = db
    .select({
      total: count(),
      mature: sql<number>`sum(case when ${schema.cards.intervalDays} >= ${MATURE_DAYS} then 1 else 0 end)`,
    })
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, userId), eq(schema.cards.language, language)))
    .get();
  const midnight = new Date(startOfDay(now));
  const reviewedToday =
    db
      .select({ n: count() })
      .from(schema.reviews)
      .where(and(eq(schema.reviews.userId, userId), gte(schema.reviews.reviewedAt, midnight)))
      .get()?.n ?? 0;
  const knownWords =
    db
      .select({ n: count() })
      .from(schema.knownWords)
      .where(and(eq(schema.knownWords.userId, userId), eq(schema.knownWords.language, language)))
      .get()?.n ?? 0;
  return {
    cards: cards?.total ?? 0,
    matureCards: Number(cards?.mature ?? 0),
    knownWords,
    reviewedToday,
    streak: reviewStreak(db, userId, now),
  };
}
