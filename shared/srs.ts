/**
 * Spaced repetition: an SM-2 style scheduler with short learning steps. A new or
 * forgotten card is seen again within minutes until it graduates, then at
 * intervals that grow with its ease.
 */

export const RATINGS = { again: 1, hard: 2, good: 3, easy: 4 } as const;
export type Rating = (typeof RATINGS)[keyof typeof RATINGS];
export const RATING_VALUES = Object.values(RATINGS) as Rating[];

/** A card's place in learning: never studied, in its short learning steps, or on growing intervals. */
export const CARD_STATES = ["new", "learning", "review"] as const;
export type CardState = (typeof CARD_STATES)[number];

/** The ways the Cards page can narrow the list: by state, or the suspended ones. */
export const CARD_FILTERS = ["all", ...CARD_STATES, "suspended"] as const;

/** A card reviewed out to three weeks counts as a word the learner knows. */
export const MATURE_DAYS = 21;

export interface SrsState {
  state: CardState;
  step: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface Scheduled extends SrsState {
  due: number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const LEARNING_STEPS_MIN = [1, 10];
const RELEARNING_STEP_MIN = 10;
const GRADUATE_DAYS = 1;
const EASY_GRADUATE_DAYS = 4;
const MIN_EASE = 1.3;
const MAX_INTERVAL_DAYS = 365 * 2;

const clampInterval = (days: number) => Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));

export function schedule(card: SrsState, rating: Rating, now: number): Scheduled {
  const reps = card.reps + 1;

  if (card.state !== "review") {
    // A relearning card (it lapsed) graduates back to a shortened version of its old interval.
    const graduateTo = card.lapses > 0 && card.intervalDays > 0 ? card.intervalDays : GRADUATE_DAYS;
    if (rating === RATINGS.easy) {
      const days = clampInterval(Math.max(graduateTo, EASY_GRADUATE_DAYS));
      return { ...card, state: "review", step: 0, intervalDays: days, reps, due: now + days * DAY };
    }
    if (rating === RATINGS.again) {
      return { ...card, state: "learning", step: 0, reps, due: now + LEARNING_STEPS_MIN[0]! * MINUTE };
    }
    const step = rating === RATINGS.good ? card.step + 1 : card.step;
    if (step >= LEARNING_STEPS_MIN.length) {
      const days = clampInterval(graduateTo);
      return { ...card, state: "review", step: 0, intervalDays: days, reps, due: now + days * DAY };
    }
    const minutes = LEARNING_STEPS_MIN[step]! * (rating === RATINGS.hard ? 1.5 : 1);
    return { ...card, state: "learning", step, reps, due: now + minutes * MINUTE };
  }

  if (rating === RATINGS.again) {
    return {
      ...card,
      state: "learning",
      step: 0,
      ease: Math.max(MIN_EASE, card.ease - 0.2),
      lapses: card.lapses + 1,
      intervalDays: clampInterval(card.intervalDays * 0.5),
      reps,
      due: now + RELEARNING_STEP_MIN * MINUTE,
    };
  }

  const ease =
    rating === RATINGS.hard
      ? Math.max(MIN_EASE, card.ease - 0.15)
      : rating === RATINGS.easy
        ? card.ease + 0.15
        : card.ease;
  const factor = rating === RATINGS.hard ? 1.2 : rating === RATINGS.easy ? card.ease * 1.3 : card.ease;
  // Always move forward by at least a day, so "good" never repeats yesterday's gap.
  const days = clampInterval(Math.max(card.intervalDays * factor, card.intervalDays + 1));
  return { ...card, state: "review", ease, intervalDays: days, reps, due: now + days * DAY };
}

export type IntervalUnit = "minute" | "hour" | "day" | "month" | "year";

/** How long an interval is, in the largest unit that fits ("10 min", "3 d", "2 mo" once worded). */
export function roughInterval(ms: number): { value: number; unit: IntervalUnit } {
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 60) return { value: minutes, unit: "minute" };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { value: hours, unit: "hour" };
  const days = Math.round(ms / DAY);
  if (days < 31) return { value: days, unit: "day" };
  const months = Math.round(days / 30);
  return months < 12
    ? { value: months, unit: "month" }
    : { value: Math.round((days / 365) * 10) / 10, unit: "year" };
}

/** How long each answer would put the card away for, for the buttons' labels. */
export function previewIntervals(
  card: SrsState,
  now: number,
): Record<Rating, ReturnType<typeof roughInterval>> {
  const out = {} as Record<Rating, ReturnType<typeof roughInterval>>;
  for (const rating of RATING_VALUES) out[rating] = roughInterval(schedule(card, rating, now).due - now);
  return out;
}
