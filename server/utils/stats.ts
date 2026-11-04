import { and, count, eq, gte, sql } from "drizzle-orm";
import { dayNumber, startOfDay } from "#shared/days";
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
  // A word can be both marked known and a mature card; count it once.
  const knownWords =
    db
      .select({ n: sql<number>`count(distinct ${schema.knownWords.word})` })
      .from(schema.knownWords)
      .where(and(eq(schema.knownWords.userId, userId), eq(schema.knownWords.language, language)))
      .get()?.n ?? 0;
  const matureNotMarked =
    db
      .select({ n: count() })
      .from(schema.cards)
      .where(
        and(
          eq(schema.cards.userId, userId),
          eq(schema.cards.language, language),
          gte(schema.cards.intervalDays, MATURE_DAYS),
          sql`lower(${schema.cards.term}) not in (select ${schema.knownWords.word} from ${schema.knownWords} where ${schema.knownWords.userId} = ${userId} and ${schema.knownWords.language} = ${language})`,
        ),
      )
      .get()?.n ?? 0;

  const days = reviewsByDay(db, userId, now);
  const today = dayNumber(now);
  return {
    cards: cards?.total ?? 0,
    matureCards: Number(cards?.mature ?? 0),
    wordsKnown: knownWords + matureNotMarked,
    reviewedToday: days.get(today) ?? 0,
    streak: streaks(days, today),
    /** Reviews on each of the last ACTIVITY_DAYS days, oldest first. */
    activity: Array.from({ length: ACTIVITY_DAYS }, (_, i) => days.get(today - ACTIVITY_DAYS + 1 + i) ?? 0),
    since: startOfDay(now - (ACTIVITY_DAYS - 1) * DAY),
  };
}
