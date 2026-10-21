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
