import { defineEventHandler, setResponseHeaders } from "h3";
import { z } from "zod";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { mediaSourceFor } from "~~/server/utils/media";
import { mediaIdParam, validParams, validQuery } from "~~/server/utils/validate";

const query = z.object({ w: z.coerce.number().int().min(80).max(800).default(300) });

/** Poster art through Learnarr, so the media server's token never reaches the browser. */
export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { id } = validParams(event, mediaIdParam);
  const { w } = validQuery(event, query);
  // Any failure means the same to the page (show the placeholder), so it is one 404.
  const response = await mediaSourceFor(id)
    .poster(id, w)
    .catch(() => null);
  if (!response?.body) throw new AppError(404, "errors.media.noPoster");
  setResponseHeaders(event, {
    "content-type": response.headers.get("content-type") ?? "image/jpeg",
    "cache-control": "private, max-age=86400",
  });
  return response.body;
});
