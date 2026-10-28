import { and, eq, inArray } from "drizzle-orm";
import { schema, type Db } from "../db";
import type { PickedWord } from "./ai/pickWords";
import type { Card } from "./cards";
import { setKnown } from "./knownWords";

export type Suggestion = typeof schema.suggestions.$inferSelect;

export const DECISIONS = ["learn", "know", "skip"] as const;
export type Decision = (typeof DECISIONS)[number];

export function suggestedTerms(db: Db, userId: string, language: string): string[] {
  return db
    .select({ term: schema.suggestions.term })
    .from(schema.suggestions)
    .where(and(eq(schema.suggestions.userId, userId), eq(schema.suggestions.language, language)))
    .all()
    .map((r) => r.term);
}

/** Save picked words for the learner to go through. A word already suggested is left alone. */
export function addSuggestions(
  db: Db,
  subtitle: { id: number; userId: string; language: string },
  words: PickedWord[],
): number {
  let added = 0;
  for (const word of words) {
    const result = db
      .insert(schema.suggestions)
      .values({
        userId: subtitle.userId,
        subtitleId: subtitle.id,
        language: subtitle.language,
        term: word.term,
        form: word.form,
        translation: word.translation,
        partOfSpeech: word.partOfSpeech,
        note: word.note,
        sentence: word.cue.text,
        sentenceStartMs: word.cue.startMs,
      })
      .onConflictDoNothing()
      .run();
    added += result.changes;
  }
  return added;
}

/**
 * Act on the learner's suggestions: "learn" turns each into a new card, "know"
 * marks the word known so it isn't suggested again, "skip" just drops it.
 * Returns the cards made.
 */
export function decideSuggestions(db: Db, userId: string, ids: number[], decision: Decision): Card[] {
  // better-sqlite3 runs a transaction on the one connection, so `db` inside it is part of it.
  return db.transaction(() => {
    const picked = db
      .select({ suggestion: schema.suggestions, mediaItemId: schema.subtitles.mediaItemId })
      .from(schema.suggestions)
      .innerJoin(schema.subtitles, eq(schema.suggestions.subtitleId, schema.subtitles.id))
      .where(and(eq(schema.suggestions.userId, userId), inArray(schema.suggestions.id, ids)))
      .all();
    const cards: Card[] = [];
    for (const { suggestion, mediaItemId } of picked) {
      const { id, createdAt: _createdAt, ...word } = suggestion;
      if (decision === "learn") {
        const card = db
          .insert(schema.cards)
          .values({ ...word, mediaItemId })
          .onConflictDoNothing()
          .returning()
          .get();
        if (card) cards.push(card);
      } else if (decision === "know") {
        setKnown(db, userId, word.language, word.term, true);
      }
      db.delete(schema.suggestions).where(eq(schema.suggestions.id, id)).run();
    }
    return cards;
  });
}
