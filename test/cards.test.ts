import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { addUser, testDb } from "./helpers";
import { schema, type Db } from "../server/db";
import { NEW_CARDS_PER_DAY, studyQueue } from "../server/utils/cards";
import { addSuggestions, decideSuggestions } from "../server/utils/suggestions";
import { createJobRunner } from "../server/utils/jobs";
import type { PickedWord } from "../server/utils/ai/pickWords";

let db: Db;
let subtitle: { id: number; userId: string; mediaItemId: number; language: string };

beforeEach(() => {
  db = testDb();
  const user = addUser(db);
  const item = db
    .insert(schema.mediaItems)
    .values({ server: "plex", serverItemId: "1", kind: "movie", title: "Roma" })
    .returning()
    .get();
  subtitle = db
    .insert(schema.subtitles)
    .values({
      userId: user.id,
      mediaItemId: item.id,
      language: "es",
      source: "plex",
      content: "",
      cueCount: 0,
    })
    .returning()
    .get();
});

const word = (term: string): PickedWord => ({
  term,
  form: term,
  translation: `${term}!`,
  partOfSpeech: null,
  note: null,
  cue: { index: 0, startMs: 1000, endMs: 2000, text: `Line with ${term}` },
});

const suggestionIds = () =>
  db
    .select({ id: schema.suggestions.id })
    .from(schema.suggestions)
    .all()
    .map((s) => s.id);

/** Words as the AI would pick them, all learned. */
function addCards(sub: typeof subtitle, words: PickedWord[]) {
  addSuggestions(db, sub, words);
  decideSuggestions(db, sub.userId, suggestionIds(), "learn");
}

describe("suggestions", () => {
  it("keeps the real line and skips words already suggested", () => {
    expect(addSuggestions(db, subtitle, [word("uno"), word("dos")])).toBe(2);
    expect(addSuggestions(db, subtitle, [word("dos"), word("tres")])).toBe(1);
    const suggestion = db.select().from(schema.suggestions).where(eq(schema.suggestions.term, "uno")).get();
    expect(suggestion).toMatchObject({ sentence: "Line with uno", sentenceStartMs: 1000 });
    expect(db.select().from(schema.cards).all()).toHaveLength(0);
  });

  it("turns a learned suggestion into a new card for the same film or episode", () => {
    addSuggestions(db, subtitle, [word("uno")]);
    const [card] = decideSuggestions(db, subtitle.userId, suggestionIds(), "learn");
    expect(card).toMatchObject({ term: "uno", state: "new", mediaItemId: subtitle.mediaItemId });
    expect(suggestionIds()).toEqual([]);
  });

  it("marks a known suggestion's word known and makes no card", () => {
    addSuggestions(db, subtitle, [word("Uno")]);
    expect(decideSuggestions(db, subtitle.userId, suggestionIds(), "know")).toEqual([]);
    expect(db.select().from(schema.knownWords).all()).toMatchObject([{ word: "uno", source: "marked" }]);
    expect(db.select().from(schema.cards).all()).toHaveLength(0);
  });

  it("drops a skipped suggestion without remembering anything", () => {
    addSuggestions(db, subtitle, [word("uno")]);
    decideSuggestions(db, subtitle.userId, suggestionIds(), "skip");
    expect(suggestionIds()).toEqual([]);
    expect(db.select().from(schema.knownWords).all()).toHaveLength(0);
  });

  it("ignores someone else's suggestions", () => {
    addSuggestions(db, subtitle, [word("uno")]);
    const other = addUser(db);
    expect(decideSuggestions(db, other.id, suggestionIds(), "learn")).toEqual([]);
    expect(suggestionIds()).toHaveLength(1);
  });
});

describe("studyQueue", () => {
  it("serves due cards, then new cards up to the daily limit", () => {
    addCards(
      subtitle,
      Array.from({ length: NEW_CARDS_PER_DAY + 5 }, (_, i) => word(`w${i}`)),
    );
    const now = Date.now();
    db.update(schema.cards)
      .set({ state: "review", due: new Date(now - 1000) })
      .where(eq(schema.cards.term, "w0"))
      .run();
    db.update(schema.cards)
      .set({ state: "review", due: new Date(now + 86_400_000) })
      .where(eq(schema.cards.term, "w1"))
      .run();

    const queue = studyQueue(db, subtitle.userId, "es", now);
    expect(queue.due.map((c) => c.term)).toEqual(["w0"]);
    expect(queue.fresh).toHaveLength(NEW_CARDS_PER_DAY);
  });

  it("counts new cards already introduced today against the limit", () => {
    addCards(
      subtitle,
      Array.from({ length: NEW_CARDS_PER_DAY }, (_, i) => word(`w${i}`)),
    );
    const cards = db.select().from(schema.cards).all();
    for (const card of cards.slice(0, 5)) {
      db.insert(schema.reviews)
        .values({
          cardId: card.id,
          userId: subtitle.userId,
          rating: 3,
          intervalDays: 0,
          wasNew: true,
          reviewedAt: new Date(),
        })
        .run();
    }
    expect(studyQueue(db, subtitle.userId, "es").fresh).toHaveLength(NEW_CARDS_PER_DAY - 5);
  });

  it("leaves out suspended cards and other languages", () => {
    addCards(subtitle, [word("uno")]);
    addCards({ ...subtitle, language: "fr" }, [word("deux")]);
    db.update(schema.cards).set({ suspended: true }).where(eq(schema.cards.term, "uno")).run();
    expect(studyQueue(db, subtitle.userId, "es").total).toBe(0);
  });
});

describe("job runner", () => {
  it("records success and failure, and marks interrupted jobs failed", async () => {
    const runner = createJobRunner(db);
    const ok = runner.start("pick-words", subtitle.userId, 1, async () => ({ added: 3 }));
    const bad = runner.start("pick-words", subtitle.userId, 2, async () => {
      throw new Error("model down");
    });
    expect(runner.active("pick-words", subtitle.userId, 1)?.id).toBe(ok.id);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(runner.get(ok.id, subtitle.userId)).toMatchObject({ state: "done", result: { added: 3 } });
    expect(runner.get(bad.id, subtitle.userId)).toMatchObject({ state: "failed", message: "model down" });
    expect(runner.get(ok.id, "someone-else")).toBeUndefined();

    runner.start("pick-words", subtitle.userId, 3, () => new Promise(() => {}));
    expect(runner.failInterrupted()).toBe(1);
  });
});
