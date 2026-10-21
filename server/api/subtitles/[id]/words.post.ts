import { z } from "zod";
import { useDb } from "~~/server/db";
import { resolveAiConfig } from "~~/server/utils/ai/config";

const params = z.object({ id: z.coerce.number().int().positive() });
const body = z.object({ count: z.union(WORD_COUNTS.map((n) => z.literal(n))).default(20) });

/** Ask the AI for this subtitle's words. Answers with the job to poll. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const { count } = await validBody(event, body);
  const job = startWordPicking(useDb(), user, id, count, resolveAiConfig(useSettings()));
  return { jobId: job.id };
});
