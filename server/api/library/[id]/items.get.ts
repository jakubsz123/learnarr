import { z } from "zod";
import { useMediaServer } from "~~/server/utils/media";
import { MediaServerError } from "~~/server/utils/media/types";

const params = z.object({ id: z.string().min(1).max(100) });
const query = z.object({
  start: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(200).default(60),
  search: z.string().trim().max(100).optional(),
});

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { id } = validParams(event, params);
  const opts = validQuery(event, query);
  try {
    return await useMediaServer().items(id, opts);
  } catch (error) {
    if (error instanceof MediaServerError)
      throw createError({ statusCode: 502, statusMessage: error.message });
    throw error;
  }
});
