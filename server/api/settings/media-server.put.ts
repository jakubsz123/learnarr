import { defineEventHandler } from "h3";
import { z } from "zod";
import { requireAdmin } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { createMediaServer } from "~~/server/utils/media";
import { MediaServerError } from "~~/server/utils/media/types";
import { useSettings } from "~~/server/utils/settings";
import { validBody } from "~~/server/utils/validate";

const body = z.object({
  kind: z.enum(["plex", "jellyfin"]),
  url: z.url({ protocol: /^https?$/ }).max(500),
  /** Omit to keep the stored token. */
  token: z.string().trim().min(1).max(500).optional(),
});

/** Connect the household's media server. Nothing is saved unless the server answers. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  if (settings.isPinned("media")) throw new AppError(409, "errors.media.fromEnv");
  const { kind, url, token: newToken } = await validBody(event, body);
  const token = newToken ?? (settings.get("media.kind") === kind ? settings.get("media.token") : null);
  if (!token) {
    throw new AppError(400, kind === "plex" ? "errors.media.needPlexToken" : "errors.media.needApiKey");
  }
  const cleanUrl = url.replace(/\/+$/, "");
  const identity = await createMediaServer(kind, cleanUrl, token)
    .identify()
    .catch((error) => {
      // While connecting, a server that can't be reached is a problem with what was typed.
      if (error instanceof MediaServerError) error.statusCode = 400;
      throw error;
    });
  settings.set("media.kind", kind);
  settings.set("media.url", cleanUrl);
  settings.set("media.token", token);
  settings.set("media.name", identity.name);
  return { kind, url: cleanUrl, ...identity };
});
