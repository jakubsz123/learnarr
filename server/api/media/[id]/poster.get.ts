import { z } from "zod";
import { useMediaServer } from "~~/server/utils/media";

const params = z.object({ id: z.string().min(1).max(100) });
const query = z.object({ w: z.coerce.number().int().min(80).max(800).default(300) });

/** Poster art through Learnarr, so the media server's token never reaches the browser. */
export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { id } = validParams(event, params);
  const { w } = validQuery(event, query);
  const response = await useMediaServer()
    .poster(id, w)
    .catch(() => null);
  if (!response?.body) throw createError({ statusCode: 404, statusMessage: "No poster" });
  setResponseHeaders(event, {
    "content-type": response.headers.get("content-type") ?? "image/jpeg",
    "cache-control": "private, max-age=86400",
  });
  return response.body;
});
