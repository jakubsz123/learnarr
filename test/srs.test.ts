import { describe, expect, it } from "vitest";
import { previewIntervals, RATINGS, schedule, type SrsState } from "../shared/srs";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const fresh: SrsState = { state: "new", step: 0, intervalDays: 0, ease: 2.5, reps: 0, lapses: 0 };

describe("schedule", () => {
  it("walks a new card through the learning steps and graduates it to a day", () => {
    const a = schedule(fresh, RATINGS.good, 0);
    expect(a).toMatchObject({ state: "learning", step: 1, due: 10 * MIN });
    const b = schedule(a, RATINGS.good, a.due);
    expect(b).toMatchObject({ state: "review", intervalDays: 1, due: a.due + DAY });
  });

  it("sends a card back to the first step on again, and graduates easy cards straight to 4 days", () => {
    expect(schedule({ ...fresh, state: "learning", step: 1 }, RATINGS.again, 0)).toMatchObject({
      step: 0,
      due: MIN,
    });
    expect(schedule(fresh, RATINGS.easy, 0)).toMatchObject({ state: "review", intervalDays: 4 });
  });

  it("grows a review interval by ease, more for easy, less for hard", () => {
    const card: SrsState = { state: "review", step: 0, intervalDays: 10, ease: 2.5, reps: 5, lapses: 0 };
    expect(schedule(card, RATINGS.good, 0).intervalDays).toBe(25);
    expect(schedule(card, RATINGS.easy, 0)).toMatchObject({ intervalDays: 33, ease: 2.65 });
    expect(schedule(card, RATINGS.hard, 0)).toMatchObject({ intervalDays: 12, ease: 2.35 });
  });

  it("always moves at least a day forward", () => {
    const card: SrsState = { state: "review", step: 0, intervalDays: 1, ease: 1.3, reps: 2, lapses: 3 };
    expect(schedule(card, RATINGS.hard, 0).intervalDays).toBe(2);
  });

  it("relearns a forgotten card, lowering its ease, then returns it at half the interval", () => {
    const card: SrsState = { state: "review", step: 0, intervalDays: 20, ease: 2.5, reps: 5, lapses: 0 };
    const lapsed = schedule(card, RATINGS.again, 0);
    expect(lapsed).toMatchObject({
      state: "learning",
      lapses: 1,
      ease: 2.3,
      intervalDays: 10,
      due: 10 * MIN,
    });
    const back = schedule(schedule(lapsed, RATINGS.good, 0), RATINGS.good, 0);
    expect(back).toMatchObject({ state: "review", intervalDays: 10 });
  });

  it("never lets ease drop below 1.3", () => {
    let card: SrsState = { state: "review", step: 0, intervalDays: 5, ease: 1.35, reps: 9, lapses: 0 };
    for (let i = 0; i < 5; i++) card = schedule(card, RATINGS.hard, 0);
    expect(card.ease).toBe(1.3);
  });
});

describe("previewIntervals", () => {
  it("labels what each button would do", () => {
    expect(previewIntervals(fresh, 0)).toEqual({ 1: "1 min", 2: "2 min", 3: "10 min", 4: "4 d" });
  });
});
