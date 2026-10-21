import { and, desc, eq } from "drizzle-orm";
import { wordKey } from "#shared/words";
import { schema, type Db } from "../db";
import { frequencyRanks } from "./frequency";

/**
 * How many of a language's most common words count as known for each level,
 * before the learner has marked anything. Rough on purpose: it only has to make
 * "% you know" start near the truth, and marking words corrects it from there.
 */
export const SEED_SIZE: Record<string, number> = { beginner: 100, intermediate: 1500, advanced: 4000 };

/** A card reviewed out to three weeks is a word the learner knows. */
export const MATURE_DAYS = 21;

export type WordState = "known" | "learning";

/** Seed the common words for the user's level, unless they already are for this level. */
export async function seedKnownWords(db: Db, user: { id: string; level: string }, language: string) {
  const seeded = db
    .select()
    .from(schema.wordSeeds)
    .where(and(eq(schema.wordSeeds.userId, user.id), eq(schema.wordSeeds.language, language)))
    .get();
  if (seeded?.level === user.level) return;

  const ranks = await frequencyRanks(language);
  const words = ranks ? [...ranks.keys()].slice(0, SEED_SIZE[user.level] ?? 0) : [];
  db.transaction((tx) => {
    tx.delete(schema.knownWords)
      .where(
        and(
          eq(schema.knownWords.userId, user.id),
          eq(schema.knownWords.language, language),
          eq(schema.knownWords.source, "seed"),
        ),
      )
      .run();
    for (const word of words) {
      tx.insert(schema.knownWords)
        .values({ userId: user.id, language, word, source: "seed" })
        .onConflictDoNothing()
        .run();
    }
    tx.insert(schema.wordSeeds)
      .values({ userId: user.id, language, level: user.level })
      .onConflictDoUpdate({
        target: [schema.wordSeeds.userId, schema.wordSeeds.language],
        set: { level: user.level },
      })
      .run();
  });
}

/**
 * What the learner knows of a language, by word: marked or seeded words are
 * known, a card makes its word "learning" until it matures.
 */
export async function wordStates(
  db: Db,
  user: { id: string; level: string },
  language: string,
): Promise<Map<string, WordState>> {
  await seedKnownWords(db, user, language);
  const states = new Map<string, WordState>();
  const cards = db
    .select({ term: schema.cards.term, intervalDays: schema.cards.intervalDays })
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, user.id), eq(schema.cards.language, language)))
    .all();
  for (const card of cards) {
    states.set(wordKey(card.term), card.intervalDays >= MATURE_DAYS ? "known" : "learning");
  }
  const known = db
    .select({ word: schema.knownWords.word })
    .from(schema.knownWords)
    .where(and(eq(schema.knownWords.userId, user.id), eq(schema.knownWords.language, language)))
    .all();
  for (const { word } of known) states.set(word, "known");
  return states;
}

/** A word's state from its dictionary form or, failing that, the form used. */
export function stateOf(states: Map<string, WordState>, lemma: string | null, surface: string) {
  return (lemma ? states.get(wordKey(lemma)) : undefined) ?? states.get(wordKey(surface)) ?? null;
}

export function setKnown(db: Db, userId: string, language: string, word: string, known: boolean) {
  const key = wordKey(word);
  if (known) {
    db.insert(schema.knownWords)
      .values({ userId, language, word: key, source: "marked" })
      .onConflictDoUpdate({
        target: [schema.knownWords.userId, schema.knownWords.language, schema.knownWords.word],
        set: { source: "marked" },
      })
      .run();
  } else {
    db.delete(schema.knownWords)
      .where(
        and(
          eq(schema.knownWords.userId, userId),
          eq(schema.knownWords.language, language),
          eq(schema.knownWords.word, key),
        ),
      )
      .run();
  }
}

/** Words the learner marked as known (not the seeded ones), most recent first. */
export function markedWords(db: Db, userId: string, language: string): string[] {
  return db
    .select({ word: schema.knownWords.word })
    .from(schema.knownWords)
    .where(
      and(
        eq(schema.knownWords.userId, userId),
        eq(schema.knownWords.language, language),
        eq(schema.knownWords.source, "marked"),
      ),
    )
    .orderBy(desc(schema.knownWords.createdAt), desc(schema.knownWords.id))
    .all()
    .map((r) => r.word);
}
