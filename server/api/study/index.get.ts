import { previewIntervals } from "#shared/srs";
import { useDb } from "~~/server/db";

/** The cards to study now, each with what its answer buttons would do. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const now = Date.now();
  const { due, fresh } = studyQueue(useDb(), user.id, user.learningLanguage, now);
  return {
    cards: [...due, ...fresh].map((card) => ({ ...card, intervals: previewIntervals(card, now) })),
    dueCount: due.length,
    newCount: fresh.length,
  };
});
