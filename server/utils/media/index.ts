import { createError } from "h3";
import { useSettings } from "../settings";
import { createJellyfin } from "./jellyfin";
import { createPlex } from "./plex";
import type { MediaServer, MediaServerKind } from "./types";

export function createMediaServer(kind: MediaServerKind, url: string, token: string): MediaServer {
  return kind === "plex" ? createPlex(url, token) : createJellyfin(url, token);
}

/** The household's media server, or a 409 telling the person to set one up. */
export function useMediaServer(): MediaServer {
  const settings = useSettings();
  const kind = settings.get("media.kind");
  const url = settings.get("media.url");
  const token = settings.get("media.token");
  if ((kind !== "plex" && kind !== "jellyfin") || !url || !token) {
    throw createError({
      statusCode: 409,
      statusMessage: "No media server is connected yet. The admin sets one up in Settings.",
    });
  }
  return createMediaServer(kind, url, token);
}
