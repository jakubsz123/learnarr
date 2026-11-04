import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { addUser, testDb } from "./helpers";
import { schema } from "../server/db";
import { createCard } from "../server/utils/cards";
import { AppError } from "../server/utils/errors";
import { reviewCard, undoReview } from "../server/utils/reviews";

function setup() {
  const db = testDb();
  const user = addUser(db);
  const item = db
    .insert(schema.mediaItems)
    .values({ server: "plex", serverItemId: "1", kind: "movie", title: "Roma" })
    .returning()
    .get();
  const values = {
    userId: user.id,
    mediaItemId: item.id,
    language: "es",
    term: "gato",
    form: "gatos",
    translation: "cat",
    sentence: "Los gatos",
  };
  return { db, user, values, card: createCard(db, values).card };
}

describe("reviews", () => {
  it("keeps one card per term, returning the existing one", () => {
    const { db, values, card } = setup();
    const again = createCard(db, { ...values, translation: "kitty" });
    expect(again).toEqual({ card, created: false });
  });

  it("undoes the last answer back to the schedule before it", () => {
    const { db, user, card } = setup();
    reviewCard(db, user.id, card.id, 3, 1_000_000);
    reviewCard(db, user.id, card.id, 3, 2_000_000);
    const afterTwo = db.select().from(schema.cards).where(eq(schema.cards.id, card.id)).get()!;
    undoReview(db, user.id, card.id);
    const afterUndo = db.select().from(schema.cards).where(eq(schema.cards.id, card.id)).get()!;
    expect(afterUndo.step).not.toBe(afterTwo.step);
    expect(db.select().from(schema.reviews).all()).toHaveLength(1);
    undoReview(db, user.id, card.id);
    expect(db.select().from(schema.cards).where(eq(schema.cards.id, card.id)).get()!.state).toBe("new");
    expect(() => undoReview(db, user.id, card.id)).toThrow(AppError);
  });

  it("won't touch someone else's card", () => {
    const { db, card } = setup();
    const stranger = addUser(db);
    expect(() => reviewCard(db, stranger.id, card.id, 3)).toThrow(/doesn't exist/);
  });
});
