import { defineEventHandler } from "h3";
import { z } from "zod";
import { requireUser } from "~~/server/utils/auth";
import { mediaSourceFor } from "~~/server/utils/media";
import { mediaIdParam, validParams, validQuery } from "~~/server/utils/validate";

const query = z.object({
  start: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(60),
  search: z.string().trim().max(100).optional(),
});

/** A page of a library's films or shows, optionally filtered by title. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, mediaIdParam);
  return mediaSourceFor(id, user).items(id, validQuery(event, query));
});
