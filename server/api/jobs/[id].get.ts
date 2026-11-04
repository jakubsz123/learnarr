import { defineEventHandler } from "h3";
import { z } from "zod";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { useJobs } from "~~/server/utils/jobs";
import { validParams } from "~~/server/utils/validate";

const params = z.object({ id: z.uuid() });

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const job = useJobs(useDb()).get(id, user.id);
  if (!job) throw new AppError(404, "errors.jobs.notFound");
  return { id: job.id, state: job.state, message: job.message, result: job.result };
});
