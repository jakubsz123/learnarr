import { and, count, eq, gte, sql } from "drizzle-orm";
import { dayNumber } from "#shared/days";
import { wordKey } from "#shared/words";
import { MATURE_DAYS } from "#shared/srs";
import { schema, type Db } from "../db";

const DAY = 24 * 60 * 60 * 1000;
/** How far back the activity chart on Today goes. */
export const ACTIVITY_DAYS = 12 * 7;

/** Reviews per calendar day over the last year, by day number (see shared/days.ts). */
function reviewsByDay(db: Db, userId: string, now: number): Map<number, number> {
  const days = new Map<number, number>();
  const rows = db
    .select({ at: schema.reviews.reviewedAt })
    .from(schema.reviews)
    .where(and(eq(schema.reviews.userId, userId), gte(schema.reviews.reviewedAt, new Date(now - 400 * DAY))))
    .all();
  for (const { at } of rows) {
    const day = dayNumber(at.getTime());
    days.set(day, (days.get(day) ?? 0) + 1);
  }
  return days;
}

/**
 * Days in a row with at least one review: the current run, ending today (or
 * yesterday, while today has none yet), and the longest in the last year.
 */
export function streaks(days: Map<number, number>, today: number): { current: number; longest: number } {
  let current = 0;
  for (let day = days.has(today) ? today : today - 1; days.has(day); day--) current++;
  let longest = 0;
  let run = 0;
  for (const day of [...days.keys()].toSorted((a, b) => a - b)) {
    run = days.has(day - 1) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current, longest };
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
  // A word can be both marked known and a mature card; count it once. Compared
  // by wordKey in JavaScript: SQLite's lower() only lowercases ASCII ("Über").
  const known = new Set(
    db
      .select({ word: schema.knownWords.word })
      .from(schema.knownWords)
      .where(and(eq(schema.knownWords.userId, userId), eq(schema.knownWords.language, language)))
      .all()
      .map((r) => r.word),
  );
  const matureCards = db
    .select({ term: schema.cards.term })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.userId, userId),
        eq(schema.cards.language, language),
        gte(schema.cards.intervalDays, MATURE_DAYS),
      ),
    )
    .all();
  for (const { term } of matureCards) known.add(wordKey(term));

  const days = reviewsByDay(db, userId, now);
  const today = dayNumber(now);
  return {
    cards: cards?.total ?? 0,
    matureCards: Number(cards?.mature ?? 0),
    wordsKnown: known.size,
    reviewedToday: days.get(today) ?? 0,
    streak: streaks(days, today),
    /** Reviews on each of the last ACTIVITY_DAYS days, oldest first, each with its date ("2026-11-04"). */
    activity: Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
      const day = today - ACTIVITY_DAYS + 1 + i;
      return { date: new Date(day * DAY).toISOString().slice(0, 10), count: days.get(day) ?? 0 };
    }),
  };
}
