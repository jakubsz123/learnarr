import { defineEventHandler } from "h3";
import { z } from "zod";
import { WORD_COUNTS } from "#shared/words";
import { useDb } from "~~/server/db";
import { resolveAiConfig } from "~~/server/utils/ai/config";
import { requireUser } from "~~/server/utils/auth";
import { useSettings } from "~~/server/utils/settings";
import { idParam, validBody, validParams } from "~~/server/utils/validate";
import { startWordPicking } from "~~/server/utils/wordPicking";

const body = z.object({ count: z.union(WORD_COUNTS.map((n) => z.literal(n))).default(20) });

/** Ask the AI to suggest this subtitle's words. Answers with the job to poll. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  const { count } = await validBody(event, body);
  const job = startWordPicking(useDb(), user, id, count, resolveAiConfig(useSettings()));
  return { jobId: job.id };
});
