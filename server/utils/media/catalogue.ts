import { CATALOGUE_LIBRARY } from "#shared/mediaSources";
import type { AppUser } from "../auth";
import {
  getFeature,
  openSubtitlesApiKey,
  OpenSubtitlesError,
  searchFeatures,
  type Feature,
} from "../opensubtitles";
import { MediaServerError, type MediaDetail, type MediaServer, type MediaSummary } from "./types";

/**
 * OpenSubtitles.com's catalogue of films and shows, browsed like a media
 * server so the library, show and episode pages work for people without Plex
 * or Jellyfin. It has no subtitle tracks of its own: getting an episode's
 * subtitle downloads one with the person's OpenSubtitles account. Searching it
 * needs their OpenSubtitles.com API key.
 *
 * Ids carry what they point at (see shared/mediaSources.ts), so an episode
 * needs only its show's entry.
 */

const CACHE_MS = 60 * 60 * 1000;
const NAME = "OpenSubtitles.com";

/** A title as people type it: lowercase, without accents ("Élite" is "elite"). */
const plain = (title: string) => title.normalize("NFD").replace(/\p{M}/gu, "").trim().toLocaleLowerCase();

const notFound = () => new MediaServerError("errors.media.noItem", { server: NAME }, 404);

type Ref =
  | { kind: "movie"; feature: string }
  | { kind: "show"; feature: string }
  | { kind: "season"; feature: string; season: number }
  | { kind: "episode"; feature: string; season: number; episode: number };

export function parseCatalogueId(id: string): Ref | null {
  const match = /^os-(m|s)-(\d+)(?:-(\d+))?(?:-(\d+))?$/.exec(id);
  if (!match) return null;
  const [, type, feature, season, episode] = match;
  if (type === "m") return season ? null : { kind: "movie", feature: feature! };
  if (episode)
    return { kind: "episode", feature: feature!, season: Number(season), episode: Number(episode) };
  if (season) return { kind: "season", feature: feature!, season: Number(season) };
  return { kind: "show", feature: feature! };
}

const showId = (feature: string) => `os-s-${feature}`;
const seasonId = (feature: string, season: number) => `${showId(feature)}-${season}`;
const episodeId = (feature: string, season: number, episode: number) =>
  `${seasonId(feature, season)}-${episode}`;

function ref(id: string): Ref {
  const parsed = parseCatalogueId(id);
  if (!parsed) throw notFound();
  return parsed;
}

function seasonOf(show: Feature, number: number) {
  const found = show.seasons.find((s) => s.number === number);
  if (!found) throw notFound();
  return found;
}

function summary(feature: Feature): MediaSummary {
  return {
    id: feature.kind === "show" ? showId(feature.id) : `os-m-${feature.id}`,
    type: feature.kind,
    title: feature.title,
    year: feature.year,
    hasPoster: !!feature.posterUrl,
  };
}

export function createCatalogue(apiKey: string, fetchImpl: typeof fetch = fetch): MediaServer {
  const cache = new Map<string, { feature: Feature; at: number }>();

  async function feature(id: string): Promise<Feature> {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.feature;
    const found = await getFeature(apiKey, id, fetchImpl);
    if (!found) throw notFound();
    cache.set(id, { feature: found, at: Date.now() });
    return found;
  }

  return {
    kind: "opensubtitles",

    async identify() {
      return { name: NAME, version: "" };
    },

    async libraries() {
      return [{ id: CATALOGUE_LIBRARY, name: NAME, type: "catalogue" }];
    },

    /** The catalogue is too big to list: it answers searches only, films and shows together. */
    async items(_libraryId, { start, limit, search }) {
      if (!search) return { items: [], total: 0 };
      const [films, shows] = await Promise.all([
        searchFeatures(apiKey, search, "movie", fetchImpl),
        searchFeatures(apiKey, search, "show", fetchImpl),
      ]);
      // The catalogue puts loose matches first: an exact title comes first here, then the better known.
      const wanted = plain(search);
      const exact = (f: Feature) => Number(plain(f.title) === wanted);
      const found = [...films, ...shows].toSorted(
        (a, b) => exact(b) - exact(a) || b.subtitleCount - a.subtitleCount,
      );
      for (const f of found) cache.set(f.id, { feature: f, at: Date.now() });
      return { items: found.slice(start, start + limit).map(summary), total: found.length };
    },

    async children(id) {
      const target = ref(id);
      const show = await feature(target.feature);
      if (target.kind === "show") {
        return show.seasons.map((s) => ({
          id: seasonId(show.id, s.number),
          type: "season" as const,
          title: `Season ${s.number}`,
          seasonNumber: s.number,
          showTitle: show.title,
          hasPoster: !!show.posterUrl,
        }));
      }
      if (target.kind === "season") {
        return seasonOf(show, target.season).episodes.map((e) => ({
          id: episodeId(show.id, target.season, e.number),
          type: "episode" as const,
          title: e.title,
          seasonNumber: target.season,
          episodeNumber: e.number,
          showTitle: show.title,
          hasPoster: !!show.posterUrl,
        }));
      }
      return [];
    },

    async item(id): Promise<MediaDetail> {
      const target = ref(id);
      const found = await feature(target.feature);
      const base = { ...summary(found), imdbId: found.imdbId, subtitleTracks: [] };
      if (target.kind === "movie" || target.kind === "show") return base;
      const inSeason = seasonOf(found, target.season);
      const show = { showId: showId(found.id), showTitle: found.title, hasPoster: !!found.posterUrl };
      if (target.kind === "season") {
        return {
          ...show,
          id,
          type: "season",
          title: `Season ${target.season}`,
          seasonNumber: target.season,
          subtitleTracks: [],
        };
      }
      const episode = inSeason.episodes.find((e) => e.number === target.episode);
      if (!episode) throw notFound();
      return {
        ...show,
        id,
        type: "episode",
        title: episode.title,
        seasonId: seasonId(found.id, target.season),
        seasonNumber: target.season,
        episodeNumber: target.episode,
        imdbId: episode.imdbId,
        showImdbId: found.imdbId,
        subtitleTracks: [],
      };
    },

    async poster(id) {
      const url = (await feature(ref(id).feature)).posterUrl;
      if (!url) throw notFound();
      return fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
    },

    async subtitle() {
      return null;
    },
  };
}

/** One catalogue per API key, so its cache lasts between requests. */
const catalogues = new Map<string, MediaServer>();

/** The catalogue as this person searches it, with their key; null until they connect OpenSubtitles.com. */
export function useCatalogue(user: AppUser): MediaServer | null {
  const apiKey = openSubtitlesApiKey(user);
  if (!apiKey) return null;
  let catalogue = catalogues.get(apiKey);
  if (!catalogue) {
    catalogue = createCatalogue(apiKey);
    catalogues.set(apiKey, catalogue);
  }
  return catalogue;
}

/** The catalogue, or a 409 asking the person to connect OpenSubtitles.com. */
export function requireCatalogue(user: AppUser): MediaServer {
  const catalogue = useCatalogue(user);
  if (!catalogue) throw new OpenSubtitlesError("errors.opensubtitles.noApiKey", 409);
  return catalogue;
}
