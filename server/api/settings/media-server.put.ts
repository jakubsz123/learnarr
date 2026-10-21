import { z } from "zod";
import { createMediaServer } from "~~/server/utils/media";
import { MediaServerError } from "~~/server/utils/media/types";

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
  if (
    settings.isFromEnv("media.kind") ||
    settings.isFromEnv("media.url") ||
    settings.isFromEnv("media.token")
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: "The media server is set by environment variables on this server.",
    });
  }
  const { kind, url, token: newToken } = await validBody(event, body);
  const token = newToken ?? (settings.get("media.kind") === kind ? settings.get("media.token") : null);
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: kind === "plex" ? "Sign in with Plex or paste a token." : "Paste an API key.",
    });
  }
  const cleanUrl = url.replace(/\/+$/, "");
  let identity;
  try {
    identity = await createMediaServer(kind, cleanUrl, token).identify();
  } catch (error) {
    if (error instanceof MediaServerError)
      throw createError({ statusCode: 400, statusMessage: error.message });
    throw error;
  }
  settings.set("media.kind", kind);
  settings.set("media.url", cleanUrl);
  settings.set("media.token", token);
  settings.set("media.name", identity.name);
  return { kind, url: cleanUrl, ...identity };
});
