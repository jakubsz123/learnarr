import { z } from "zod";
import { useDb } from "~~/server/db";

const params = z.object({ id: z.uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const job = useJobs(useDb()).get(id, user.id);
  if (!job) throw createError({ statusCode: 404, statusMessage: "No such job." });
  return { id: job.id, state: job.state, message: job.message, result: job.result };
});
