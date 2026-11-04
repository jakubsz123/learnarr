import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { studyQueue } from "~~/server/utils/cards";
import { seedKnownWords } from "~~/server/utils/knownWords";
import { recentItems } from "~~/server/utils/mediaItems";
import { learningStats } from "~~/server/utils/stats";
import { coverageOf } from "~~/server/utils/subtitleWords";

/** Everything the Today page shows: what's due, how it's going and what you were watching. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const db = useDb();
  const language = user.learningLanguage;
  await seedKnownWords(db, user, language);
  const queue = studyQueue(db, user.id, language);
  const recent = recentItems(db, user.id, language, 8);
  const coverage = await coverageOf(
    db,
    user,
    language,
    recent.map((r) => r.subtitleId),
  );
  return {
    due: queue.due.length,
    fresh: queue.fresh.length,
    stats: learningStats(db, user.id, language),
    recent: recent.map((r) => ({ ...r, coverage: coverage.get(r.subtitleId) ?? null })),
  };
});
