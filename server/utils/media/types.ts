import type { ErrorKey, MessageParams } from "#shared/messages";
import { AppError, UPSTREAM_FAILED } from "../errors";

export type MediaServerKind = "plex" | "jellyfin";
/** Where a film or show comes from: the household's media server, OpenSubtitles.com's catalogue, or an upload. */
export type MediaSourceKind = MediaServerKind | "opensubtitles" | "upload";

export interface Library {
  id: string;
  name: string;
  /** A catalogue can't be listed, only searched; uploads are the learner's own. */
  type: "movies" | "shows" | "catalogue" | "uploads";
}

export interface MediaSummary {
  id: string;
  type: "movie" | "show" | "season" | "episode";
  title: string;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  showTitle?: string;
  hasPoster: boolean;
}

export interface SubtitleTrack {
  id: string;
  /** ISO 639-1, or null when the server doesn't know. */
  language: string | null;
  label: string;
  codec: string;
  forced: boolean;
  external: boolean;
  /** Text tracks can be read; picture-based ones (PGS, VobSub) can't. */
  text: boolean;
}

export interface MediaDetail extends MediaSummary {
  showId?: string;
  /** For an episode, its season. */
  seasonId?: string;
  imdbId?: string;
  /** For an episode, the show's IMDb id, which is what subtitle catalogues file episodes under. */
  showImdbId?: string;
  subtitleTracks: SubtitleTrack[];
}

export interface MediaServer {
  kind: MediaSourceKind;
  /** Server name and version, or throws a MediaServerError. */
  identify(): Promise<{ name: string; version: string }>;
  libraries(): Promise<Library[]>;
  items(
    libraryId: string,
    opts: { start: number; limit: number; search?: string },
  ): Promise<{
    items: MediaSummary[];
    total: number;
  }>;
  /** A show's seasons, or a season's episodes. */
  children(id: string): Promise<MediaSummary[]>;
  item(id: string): Promise<MediaDetail>;
  poster(id: string, width: number): Promise<Response>;
  /** The track's text, or null when the server won't serve it as text. */
  subtitle(item: MediaDetail, track: SubtitleTrack): Promise<string | null>;
}

/**
 * The media server failed or refused. `server` in the message is "Plex" or
 * "Jellyfin". It answers UPSTREAM_FAILED (the media server's fault) unless a status says
 * otherwise: 404 for an item it doesn't have, 400 while connecting.
 */
export class MediaServerError extends AppError {
  constructor(key: ErrorKey, params: MessageParams = {}, statusCode = UPSTREAM_FAILED) {
    super(statusCode, key, params);
    this.name = "MediaServerError";
  }
}

/**
 * The episode one step from this one: the next or previous in its season, else
 * the first of the next season or the last of the one before.
 */
async function neighbour(server: MediaServer, item: MediaDetail, step: 1 | -1): Promise<MediaSummary | null> {
  if (item.type !== "episode" || !item.seasonId) return null;
  const episodes = await server.children(item.seasonId);
  const at = episodes.findIndex((e) => e.id === item.id);
  const adjacent = at === -1 ? undefined : episodes[at + step];
  if (adjacent) return adjacent;
  if (!item.showId || item.seasonNumber === undefined) return null;
  const here = item.seasonNumber;
  const seasons = (await server.children(item.showId))
    .filter((s) => s.type === "season" && ((s.seasonNumber ?? 0) - here) * step > 0)
    .toSorted((a, b) => step * ((a.seasonNumber ?? 0) - (b.seasonNumber ?? 0)));
  for (const season of seasons) {
    const inSeason = await server.children(season.id);
    const pick = step === 1 ? inSeason[0] : inSeason.at(-1);
    if (pick) return pick;
  }
  return null;
}

export const nextEpisode = (server: MediaServer, item: MediaDetail) => neighbour(server, item, 1);
export const previousEpisode = (server: MediaServer, item: MediaDetail) => neighbour(server, item, -1);
