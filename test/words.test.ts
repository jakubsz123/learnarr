import { beforeEach, describe, expect, it } from "vitest";
import { frequencyBand, frequencyLabel } from "#shared/frequency";
import { splitWords } from "#shared/words";
import { addUser, testDb } from "./helpers";
import { schema, type Db } from "../server/db";
import { rankTable, setFrequencyLoaderForTests, wordRank } from "../server/utils/frequency";
import { SEED_SIZE, seedKnownWords, setKnown, stateOf, wordStates } from "../server/utils/knownWords";
import { buildTranscript, transcriptCoverage } from "../server/utils/transcript";
import { reviewStreak } from "../server/utils/stats";
import type { LemmaToken } from "../server/db/schema";

const LIST = Array.from({ length: 5000 }, (_, i) => `w${i + 1}`);
LIST.splice(0, 4, "de", "que", "no", "a");

describe("frequency lists", () => {
  it("ranks words by line, most common first", () => {
    const ranks = rankTable("de\nque\nno\n");
    expect(ranks.get("que")).toBe(2);
    expect(wordRank(ranks, "Hola", "No")).toBe(3);
    expect(wordRank(ranks, "zzz")).toBeNull();
  });

  it("bands ranks", () => {
    expect(frequencyBand(12)).toBe("top");
    expect(frequencyBand(2500)).toBe("common");
    expect(frequencyBand(9000)).toBe("less");
    expect(frequencyBand(null)).toBe("rare");
    expect(frequencyLabel(12)).toBe("Very common · #12");
  });
});

describe("splitting words", () => {
  it("keeps inner apostrophes and hyphens and skips punctuation", () => {
    const text = "¿Qu'est-ce que c'est? ¡Vale, 42!";
    expect(splitWords(text).map((t) => text.slice(t.start, t.end))).toEqual([
      "Qu'est-ce",
      "que",
      "c'est",
      "Vale",
    ]);
  });
});

describe("known words", () => {
  let db: Db;
  beforeEach(() => {
    db = testDb();
    setFrequencyLoaderForTests(async (language) => (language === "es" ? LIST.join("\n") : null));
  });

  it("seeds the common words for the level and reseeds when the level changes", async () => {
    const user = addUser(db, { level: "beginner" });
    await seedKnownWords(db, user, "es");
    expect(db.select().from(schema.knownWords).all()).toHaveLength(SEED_SIZE.beginner!);
    await seedKnownWords(db, { ...user, level: "intermediate" }, "es");
    expect(db.select().from(schema.knownWords).all()).toHaveLength(SEED_SIZE.intermediate!);
  });

  it("keeps marked words through a reseed, and a card makes a word 'learning'", async () => {
    const user = addUser(db, { level: "beginner" });
    setKnown(db, user.id, "es", "Perro", true);
    await seedKnownWords(db, { ...user, level: "advanced" }, "es");
    const item = db
      .insert(schema.mediaItems)
      .values({ server: "plex", serverItemId: "1", kind: "movie", title: "Roma" })
      .returning()
      .get();
    db.insert(schema.cards)
      .values({
        userId: user.id,
        mediaItemId: item.id,
        language: "es",
        term: "gato",
        form: "gatos",
        translation: "cat",
        sentence: "Los gatos",
      })
      .run();
    const states = await wordStates(db, { ...user, level: "advanced" }, "es");
    expect(states.get("perro")).toBe("known");
    expect(states.get("gato")).toBe("learning");
    expect(stateOf(states, null, "Que")).toBe("known");
    setKnown(db, user.id, "es", "perro", false);
    expect((await wordStates(db, { ...user, level: "advanced" }, "es")).get("perro")).toBeUndefined();
  });

  it("seeds nothing for a language without a list", async () => {
    const user = addUser(db);
    expect((await wordStates(db, user, "ja")).size).toBe(0);
  });
});

describe("transcripts", () => {
  const cues = [
    { index: 0, startMs: 0, endMs: 1000, text: "Los gatos comen." },
    { index: 1, startMs: 1000, endMs: 2000, text: "El gato, Pedro." },
  ];
  const tokens: LemmaToken[] = [
    [0, 0, 3, "el", "DET"],
    [0, 4, 9, "gato", "NOUN"],
    [0, 10, 15, "comer", "VERB"],
    [0, 15, 16, ".", "PUNCT"],
    [1, 0, 2, "el", "DET"],
    [1, 3, 7, "gato", "NOUN"],
    [1, 7, 8, ",", "PUNCT"],
    [1, 9, 14, "Pedro", "PROPN"],
  ];
  const states = new Map([["el", "known" as const]]);

  it("groups uses under their dictionary form and leaves names out of the count", () => {
    const t = buildTranscript(cues, tokens, states, rankTable("el\ngato\n"));
    expect(t.vocab.map((v) => [v.word, v.forms, v.count, v.rank])).toEqual([
      ["el", ["los", "el"], 2, 1],
      ["gato", ["gatos", "gato"], 2, 2],
      ["comer", ["comen"], 1, null],
      ["pedro", ["pedro"], 0, null],
    ]);
    expect(t.lines[1]).toEqual([
      [0, 2, 0],
      [3, 7, 1],
      [9, 14, 3],
    ]);
    expect(transcriptCoverage(t)).toBeCloseTo(2 / 5);
  });

  it("splits on spaces without lemmas, and then has no coverage", () => {
    const t = buildTranscript(cues, null, states, null);
    expect(t.vocab.map((v) => v.word)).toEqual(["los", "gatos", "comen", "el", "gato", "pedro"]);
    expect(t.vocab[3]!.state).toBe("known");
    expect(transcriptCoverage(t)).toBeNull();
  });
});

describe("review streak", () => {
  it("counts days in a row, allowing today to be still to come", () => {
    const db = testDb();
    const user = addUser(db);
    const item = db
      .insert(schema.mediaItems)
      .values({ server: "plex", serverItemId: "1", kind: "movie", title: "Roma" })
      .returning()
      .get();
    const card = db
      .insert(schema.cards)
      .values({
        userId: user.id,
        mediaItemId: item.id,
        language: "es",
        term: "a",
        form: "a",
        translation: "a",
        sentence: "a",
      })
      .returning()
      .get();
    const now = new Date(2026, 9, 21, 12).getTime();
    const day = 24 * 60 * 60 * 1000;
    for (const ago of [1, 2, 3, 5]) {
      db.insert(schema.reviews)
        .values({
          cardId: card.id,
          userId: user.id,
          rating: 3,
          intervalDays: 1,
          reviewedAt: new Date(now - ago * day),
        })
        .run();
    }
    expect(reviewStreak(db, user.id, now)).toBe(3);
  });
});
