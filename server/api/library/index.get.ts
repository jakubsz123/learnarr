import { defineEventHandler } from "h3";
import { requireUser } from "~~/server/utils/auth";
import { mediaServerSettings, useMediaServer } from "~~/server/utils/media";
import { useCatalogue } from "~~/server/utils/media/catalogue";
import { useSettings } from "~~/server/utils/settings";

/** The media server's film and show libraries, if there is one, then OpenSubtitles.com's catalogue to search. */
export default defineEventHandler(async (event) => {
  await requireUser(event);
  const server = mediaServerSettings(useSettings()) ? useMediaServer() : null;
  const libraries = [...(server ? await server.libraries() : []), ...(await useCatalogue().libraries())];
  return { server: server?.kind ?? null, libraries };
});
