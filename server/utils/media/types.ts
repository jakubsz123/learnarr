export type MediaServerKind = "plex" | "jellyfin";

export interface Library {
  id: string;
  name: string;
  type: "movies" | "shows";
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
  kind: MediaServerKind;
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

export class MediaServerError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "MediaServerError";
  }
}

/** The episode after this one: next in its season, else the first of the next season. */
export async function nextEpisode(server: MediaServer, item: MediaDetail): Promise<MediaSummary | null> {
  if (item.type !== "episode" || !item.seasonId) return null;
  const episodes = await server.children(item.seasonId);
  const at = episodes.findIndex((e) => e.id === item.id);
  if (at !== -1 && episodes[at + 1]) return episodes[at + 1]!;
  if (!item.showId || item.seasonNumber === undefined) return null;
  const later = (await server.children(item.showId))
    .filter((s) => s.type === "season" && (s.seasonNumber ?? 0) > item.seasonNumber!)
    .toSorted((a, b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0));
  for (const season of later) {
    const first = (await server.children(season.id))[0];
    if (first) return first;
  }
  return null;
}
