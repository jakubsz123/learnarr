import { toLanguageCode } from "#shared/languages";
import { parseSubtitle } from "#shared/subtitles";
import { mediaFetch, mediaJson, mediaText } from "./http";
import type { Library, MediaDetail, MediaServer, MediaSummary, SubtitleTrack } from "./types";

export const PLEX_CLIENT_ID = "learnarr";
export const PLEX_PRODUCT = "Learnarr";

const TEXT_CODECS = new Set(["srt", "subrip", "ass", "ssa", "vtt", "webvtt", "smi", "txt"]);
const SUBTITLE_STREAM = 3;

// Plex's JSON is untyped; the mappers below are where it becomes ours.
type PlexMetadata = Record<string, any>;

function mapType(type: string): MediaSummary["type"] {
  if (type === "show") return "show";
  if (type === "season") return "season";
  if (type === "episode") return "episode";
  return "movie";
}

function guid(raw: PlexMetadata, scheme: string): string | undefined {
  const match = (raw.Guid ?? []).find(
    (g: any) => typeof g?.id === "string" && g.id.startsWith(`${scheme}://`),
  );
  return match ? match.id.slice(scheme.length + 3) : undefined;
}

export function mapPlexSummary(raw: PlexMetadata): MediaSummary {
  return {
    id: String(raw.ratingKey),
    type: mapType(raw.type),
    title: raw.title,
    year: raw.year,
    seasonNumber: raw.type === "season" ? raw.index : raw.parentIndex,
    episodeNumber: raw.type === "episode" ? raw.index : undefined,
    showTitle: raw.grandparentTitle ?? (raw.type === "season" ? raw.parentTitle : undefined),
    hasPoster: Boolean(raw.thumb),
  };
}

export function mapPlexTrack(raw: PlexMetadata): SubtitleTrack {
  const codec = String(raw.codec ?? "").toLowerCase();
  return {
    id: String(raw.id),
    language: toLanguageCode(raw.languageTag ?? raw.languageCode ?? raw.language),
    label: raw.extendedDisplayTitle ?? raw.displayTitle ?? raw.language ?? "Unknown",
    codec,
    forced: Boolean(raw.forced),
    external: Boolean(raw.key),
    text: TEXT_CODECS.has(codec),
  };
}

export function mapPlexDetail(raw: PlexMetadata): MediaDetail & { streamKeys: Record<string, string> } {
  const streams: PlexMetadata[] = raw.Media?.[0]?.Part?.[0]?.Stream ?? [];
  const subtitles = streams.filter((s) => s.streamType === SUBTITLE_STREAM);
  return {
    ...mapPlexSummary(raw),
    showId: raw.grandparentRatingKey ? String(raw.grandparentRatingKey) : undefined,
    imdbId: guid(raw, "imdb"),
    subtitleTracks: subtitles.map(mapPlexTrack),
    streamKeys: Object.fromEntries(subtitles.filter((s) => s.key).map((s) => [String(s.id), String(s.key)])),
  };
}

export function createPlex(url: string, token: string, fetchImpl: typeof fetch = fetch): MediaServer {
  const base = url.replace(/\/+$/, "");
  const headers = {
    "X-Plex-Token": token,
    "X-Plex-Client-Identifier": PLEX_CLIENT_ID,
    "X-Plex-Product": PLEX_PRODUCT,
  };
  const get = <T>(path: string, query: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
    const sep = qs.size ? `?${qs}` : "";
    return mediaJson<{ MediaContainer: T }>(
      `${base}${path}${sep}`,
      { headers, label: "Plex" },
      fetchImpl,
    ).then((json) => json.MediaContainer);
  };

  async function detail(id: string) {
    const data = await get<{ Metadata?: PlexMetadata[] }>(`/library/metadata/${encodeURIComponent(id)}`, {
      includeGuids: 1,
    });
    const raw = data.Metadata?.[0];
    if (!raw) throw new Error("Plex returned no item");
    return mapPlexDetail(raw);
  }

  return {
    kind: "plex",

    async identify() {
      const info = await get<{ friendlyName: string; version: string }>("/");
      return { name: info.friendlyName, version: info.version };
    },

    async libraries() {
      const data = await get<{ Directory?: PlexMetadata[] }>("/library/sections");
      return (data.Directory ?? [])
        .filter((d) => d.type === "movie" || d.type === "show")
        .map((d): Library => ({
          id: String(d.key),
          name: d.title,
          type: d.type === "show" ? "shows" : "movies",
        }));
    },

    async items(libraryId, { start, limit, search }) {
      const data = await get<{ Metadata?: PlexMetadata[]; totalSize?: number; size?: number }>(
        `/library/sections/${encodeURIComponent(libraryId)}/all`,
        {
          "X-Plex-Container-Start": start,
          "X-Plex-Container-Size": limit,
          sort: "titleSort",
          ...(search ? { title: search } : {}),
        },
      );
      const items = (data.Metadata ?? []).map(mapPlexSummary);
      return { items, total: data.totalSize ?? data.size ?? items.length };
    },

    async children(id) {
      const data = await get<{ Metadata?: PlexMetadata[] }>(
        `/library/metadata/${encodeURIComponent(id)}/children`,
      );
      return (data.Metadata ?? []).map(mapPlexSummary);
    },

    async item(id) {
      const item = await detail(id);
      if (item.type === "episode" && item.showId) {
        item.showImdbId = (await detail(item.showId).catch(() => undefined))?.imdbId;
      }
      const { streamKeys: _keys, ...rest } = item;
      return rest;
    },

    poster(id, width) {
      const thumb = `/library/metadata/${encodeURIComponent(id)}/thumb`;
      const qs = new URLSearchParams({
        width: String(width),
        height: String(Math.round(width * 1.5)),
        minSize: "1",
        url: thumb,
      });
      return mediaFetch(`${base}/photo/:/transcode?${qs}`, { headers, label: "Plex" }, fetchImpl);
    },

    async subtitle(item, track) {
      // A sidecar file has a key Plex serves as-is. An embedded track has none, but
      // some Plex versions still answer at the streams path; that's the one cheap try.
      const { streamKeys } = await detail(item.id);
      const path = streamKeys[track.id] ?? `/library/streams/${encodeURIComponent(track.id)}`;
      const text = await mediaText(`${base}${path}`, headers, fetchImpl);
      return text && parseSubtitle(text).length > 0 ? text : null;
    },
  };
}
