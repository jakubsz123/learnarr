import { toLanguageCode } from "#shared/languages";
import { parseSubtitle } from "#shared/subtitles";
import { mediaFetch, mediaJson, mediaText } from "./http";
import type { Library, MediaDetail, MediaServer, MediaSummary, SubtitleTrack } from "./types";
import { VERSION } from "#shared/version";

// Jellyfin's JSON is untyped; the mappers below are where it becomes ours.
type JellyfinItem = Record<string, any>;

function mapType(type: string): MediaSummary["type"] {
  if (type === "Series") return "show";
  if (type === "Season") return "season";
  if (type === "Episode") return "episode";
  return "movie";
}

export function mapJellyfinSummary(raw: JellyfinItem): MediaSummary {
  const type = mapType(raw.Type);
  return {
    id: String(raw.Id),
    type,
    title: raw.Name,
    year: raw.ProductionYear,
    seasonNumber: type === "season" ? raw.IndexNumber : raw.ParentIndexNumber,
    episodeNumber: type === "episode" ? raw.IndexNumber : undefined,
    showTitle: raw.SeriesName,
    hasPoster: Boolean(raw.ImageTags?.Primary),
  };
}

export function mapJellyfinTrack(raw: JellyfinItem): SubtitleTrack {
  return {
    id: String(raw.Index),
    language: toLanguageCode(raw.Language),
    label: raw.DisplayTitle ?? raw.Language ?? "Unknown",
    codec: String(raw.Codec ?? "").toLowerCase(),
    forced: Boolean(raw.IsForced),
    external: Boolean(raw.IsExternal),
    text: Boolean(raw.IsTextSubtitleStream),
  };
}

export function mapJellyfinDetail(raw: JellyfinItem): MediaDetail & { mediaSourceId: string } {
  const streams: JellyfinItem[] = raw.MediaStreams ?? raw.MediaSources?.[0]?.MediaStreams ?? [];
  return {
    ...mapJellyfinSummary(raw),
    showId: raw.SeriesId,
    seasonId: raw.Type === "Episode" ? raw.SeasonId : undefined,
    imdbId: raw.ProviderIds?.Imdb,
    subtitleTracks: streams.filter((s) => s.Type === "Subtitle").map(mapJellyfinTrack),
    mediaSourceId: raw.MediaSources?.[0]?.Id ?? raw.Id,
  };
}

export function createJellyfin(url: string, apiKey: string, fetchImpl: typeof fetch = fetch): MediaServer {
  const base = url.replace(/\/+$/, "");
  const headers = {
    Authorization: `MediaBrowser Client="Learnarr", Device="Learnarr", DeviceId="learnarr", Version="${VERSION}", Token="${apiKey}"`,
  };
  const get = <T>(path: string, query: Record<string, string | number | boolean> = {}) => {
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]));
    const sep = qs.size ? `?${qs}` : "";
    return mediaJson<T>(`${base}${path}${sep}`, { headers, label: "Jellyfin" }, fetchImpl);
  };

  async function detail(id: string) {
    const data = await get<{ Items?: JellyfinItem[] }>("/Items", {
      Ids: id,
      Fields: "MediaStreams,MediaSources,ProviderIds",
    });
    const raw = data.Items?.[0];
    if (!raw) throw new Error("Jellyfin returned no item");
    return mapJellyfinDetail(raw);
  }

  return {
    kind: "jellyfin",

    async identify() {
      const info = await get<{ ServerName: string; Version: string }>("/System/Info");
      return { name: info.ServerName, version: info.Version };
    },

    async libraries() {
      const folders = await get<JellyfinItem[]>("/Library/VirtualFolders");
      return folders
        .filter((f) => f.CollectionType === "movies" || f.CollectionType === "tvshows")
        .map((f): Library => ({
          id: String(f.ItemId),
          name: f.Name,
          type: f.CollectionType === "tvshows" ? "shows" : "movies",
        }));
    },

    async items(libraryId, { start, limit, search }) {
      const data = await get<{ Items: JellyfinItem[]; TotalRecordCount: number }>("/Items", {
        ParentId: libraryId,
        Recursive: true,
        IncludeItemTypes: "Movie,Series",
        SortBy: "SortName",
        StartIndex: start,
        Limit: limit,
        Fields: "ProductionYear",
        ...(search ? { SearchTerm: search } : {}),
      });
      return { items: data.Items.map(mapJellyfinSummary), total: data.TotalRecordCount };
    },

    async children(id) {
      const data = await get<{ Items: JellyfinItem[] }>("/Items", {
        ParentId: id,
        SortBy: "ParentIndexNumber,IndexNumber,SortName",
      });
      return data.Items.map(mapJellyfinSummary).filter((i) => i.type === "season" || i.type === "episode");
    },

    async item(id) {
      const { mediaSourceId: _source, ...item } = await detail(id);
      if (item.type === "episode" && item.showId) {
        item.showImdbId = (await detail(item.showId).catch(() => undefined))?.imdbId;
      }
      return item;
    },

    poster(id, width) {
      return mediaFetch(
        `${base}/Items/${encodeURIComponent(id)}/Images/Primary?maxWidth=${width}&quality=85`,
        { headers, label: "Jellyfin" },
        fetchImpl,
      );
    },

    async subtitle(item, track) {
      // Jellyfin converts any text track, embedded or not, to SRT on request.
      const { mediaSourceId } = await detail(item.id);
      const path = `/Videos/${encodeURIComponent(item.id)}/${encodeURIComponent(mediaSourceId)}/Subtitles/${encodeURIComponent(track.id)}/Stream.srt`;
      const text = await mediaText(`${base}${path}`, headers, fetchImpl);
      return text && parseSubtitle(text).length > 0 ? text : null;
    },
  };
}
