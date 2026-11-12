import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { mediaServerSettings, useMediaServer } from "~~/server/utils/media";
import { useCatalogue } from "~~/server/utils/media/catalogue";
import { createUploads } from "~~/server/utils/media/uploads";
import { useSettings } from "~~/server/utils/settings";

/**
 * Where films and shows come from: the media server's libraries, if there is
 * one, then the places beyond it: OpenSubtitles.com's catalogue (once the
 * admin adds an API key) and the learner's own uploads.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const connection = mediaServerSettings(useSettings());
  const server = connection ? await useMediaServer().libraries() : [];
  const catalogue = useCatalogue();
  const elsewhere = [
    ...(catalogue ? await catalogue.libraries() : []),
    ...(await createUploads(useDb(), user.id).libraries()),
  ];
  return {
    server: connection ? { kind: connection.kind, name: connection.name } : null,
    libraries: server,
    elsewhere,
    /** Whether OpenSubtitles.com can be searched; it needs the admin to add an API key. */
    openSubtitles: Boolean(catalogue),
  };
});
