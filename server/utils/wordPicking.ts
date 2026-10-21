import { eq } from "drizzle-orm";
import { createError } from "h3";
import { parseSubtitle } from "#shared/subtitles";
import { wordKey } from "#shared/words";
import { schema, type Db } from "../db";
import type { AppUser } from "./auth";
import { pickWords, type PickRequest } from "./ai/pickWords";
import type { AiConfig } from "./ai/client";
import { addCards, knownTerms } from "./cards";
import { useJobs } from "./jobs";
import { markedWords, wordStates } from "./knownWords";

export const WORD_COUNTS = [10, 20, 30] as const;

/** Queue word picking for one of the user's subtitles; joins a run already in progress. */
export function startWordPicking(
  db: Db,
  user: AppUser,
  subtitleId: number,
  count: number,
  config: AiConfig | null,
) {
  const subtitle = db.select().from(schema.subtitles).where(eq(schema.subtitles.id, subtitleId)).get();
  if (!subtitle || subtitle.userId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: "That subtitle isn't in your library." });
  }
  if (!config) {
    throw createError({
      statusCode: 409,
      statusMessage: "No AI provider is set up yet. The admin sets one up in Settings.",
    });
  }
  const jobs = useJobs(db);
  const running = jobs.active("pick-words", user.id, subtitleId);
  if (running) return running;

  return jobs.start("pick-words", user.id, subtitleId, async () => {
    const request: PickRequest = {
      cues: parseSubtitle(subtitle.content),
      language: subtitle.language,
      nativeLanguage: user.nativeLanguage,
      level: user.level,
      count,
      known: [...knownTerms(db, user.id, subtitle.language), ...markedWords(db, user.id, subtitle.language)],
    };
    // The prompt can only list so many words; the common ones seeded for the
    // level are dropped here instead.
    const states = await wordStates(db, user, subtitle.language);
    const words = (await pickWords(config, request)).filter((w) => states.get(wordKey(w.term)) !== "known");
    const added = addCards(db, subtitle, words);
    db.update(schema.subtitles)
      .set({ wordsPickedAt: new Date() })
      .where(eq(schema.subtitles.id, subtitleId))
      .run();
    return { added, picked: words.length };
  });
}
