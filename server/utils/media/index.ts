import { AppError } from "../errors";
import { useSettings, type Settings } from "../settings";
import { useDb } from "../../db";
import { isCatalogueId, isUploadId } from "#shared/mediaSources";
import { useCatalogue } from "./catalogue";
import { createUploads } from "./uploads";
import { createJellyfin } from "./jellyfin";
import { createPlex } from "./plex";
import type { MediaServer, MediaServerKind } from "./types";

export function createMediaServer(kind: MediaServerKind, url: string, token: string): MediaServer {
  return kind === "plex" ? createPlex(url, token) : createJellyfin(url, token);
}

/** The household's media server connection, or null until the admin sets one up. */
export function mediaServerSettings(settings: Settings) {
  const kind = settings.get("media.kind");
  const url = settings.get("media.url");
  const token = settings.get("media.token");
  if ((kind !== "plex" && kind !== "jellyfin") || !url || !token) return null;
  return { kind: kind as MediaServerKind, url, token, name: settings.get("media.name") };
}

/** The household's media server, or a 409 telling the person to set one up. */
export function useMediaServer(): MediaServer {
  const connection = mediaServerSettings(useSettings());
  if (!connection) throw new AppError(409, "errors.media.notConnected");
  return createMediaServer(connection.kind, connection.url, connection.token);
}

/**
 * Where a film, show or library id lives: OpenSubtitles.com's catalogue, the
 * learner's own uploads, or the household's media server.
 */
export function mediaSourceFor(id: string, userId: string): MediaServer {
  if (isCatalogueId(id)) return useCatalogue();
  if (isUploadId(id)) return createUploads(useDb(), userId);
  return useMediaServer();
}
