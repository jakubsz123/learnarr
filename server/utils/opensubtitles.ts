import type { ErrorKey, MessageParams } from "#shared/messages";
import { VERSION } from "#shared/version";
import { AppError, UPSTREAM_FAILED } from "./errors";

/**
 * OpenSubtitles.com, used only when the media server has no subtitle in the
 * language. Learnarr identifies itself with its own API key, as the API's terms
 * ask of an application, and every download is made with the person's own
 * account, on their own daily quota.
 */

const API = "https://api.opensubtitles.com/api/v1";
const LEARNARR_API_KEY = "hxBVpTnU6WpxQlqhkqMIQxmjj2eV3Hss";
const USER_AGENT = `Learnarr v${VERSION}`;
// Tokens last a day; renew a little early rather than fail a download.
const SESSION_TTL_MS = 23 * 60 * 60 * 1000;

export class OpenSubtitlesError extends AppError {
  constructor(key: ErrorKey, statusCode = UPSTREAM_FAILED, params: MessageParams = {}) {
    super(statusCode, key, params);
    this.name = "OpenSubtitlesError";
  }
}

function headers(token?: string): Record<string, string> {
  return {
    "Api-Key": process.env.OPENSUBTITLES_API_KEY || LEARNARR_API_KEY,
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function call(url: string, init: RequestInit, fetchImpl: typeof fetch): Promise<Response> {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new OpenSubtitlesError("errors.opensubtitles.unreachable");
  }
}

export interface OpenSubtitlesSession {
  token: string;
  apiBase: string;
  expiresAt: number;
}

export interface OpenSubtitlesAccount {
  allowedDownloads: number | null;
  vip: boolean;
}

export async function openSubtitlesLogin(
  username: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ session: OpenSubtitlesSession; account: OpenSubtitlesAccount }> {
  const response = await call(
    `${API}/login`,
    { method: "POST", headers: headers(), body: JSON.stringify({ username, password }) },
    fetchImpl,
  );
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new OpenSubtitlesError("errors.opensubtitles.badLogin", 400);
  }
  if (response.status === 429) {
    throw new OpenSubtitlesError("errors.opensubtitles.loginLimited", 429);
  }
  if (!response.ok)
    throw new OpenSubtitlesError("errors.opensubtitles.httpError", UPSTREAM_FAILED, {
      status: response.status,
    });
  const data = (await response.json()) as {
    token?: string;
    base_url?: string;
    user?: { allowed_downloads?: number; vip?: boolean };
  };
  if (!data.token) throw new OpenSubtitlesError("errors.opensubtitles.badAnswer");
  // The login answer names the host this account's further calls should use.
  const apiBase = data.base_url ? `https://${data.base_url.replace(/^https?:\/\//, "")}/api/v1` : API;
  return {
    session: { token: data.token, apiBase, expiresAt: Date.now() + SESSION_TTL_MS },
    account: { allowedDownloads: data.user?.allowed_downloads ?? null, vip: Boolean(data.user?.vip) },
  };
}

/** A film or show in OpenSubtitles.com's catalogue. */
export interface Feature {
  id: string;
  kind: "movie" | "show";
  title: string;
  year?: number;
  imdbId?: string;
  posterUrl?: string;
  /** Subtitles of any language the catalogue has for it; a rough measure of how well known it is. */
  subtitleCount: number;
  /** A show's seasons, with each episode's own IMDb id. */
  seasons: { number: number; episodes: { number: number; title: string; imdbId?: string }[] }[];
}

const imdbId = (n: unknown) => (Number(n) > 0 ? `tt${String(n).padStart(7, "0")}` : undefined);

const FEATURE_KINDS: Record<string, Feature["kind"]> = { Movie: "movie", Tvshow: "show" };

/** Search results leave out `feature_type`; the kind searched for stands in for it. */
function toFeature(a: Record<string, any>, searched?: Feature["kind"]): Feature | null {
  const kind = a.feature_type ? FEATURE_KINDS[a.feature_type] : searched;
  if (!kind || !a.feature_id) return null;
  return {
    id: String(a.feature_id),
    kind,
    // `title` comes lowercased; the original title keeps its capitals and accents.
    title: String(a.original_title || a.title || ""),
    year: Number(a.year) || undefined,
    imdbId: imdbId(a.imdb_id),
    // The catalogue's placeholder image is a generic icon, not a poster.
    posterUrl: typeof a.img_url === "string" && !a.img_url.includes("placeholder") ? a.img_url : undefined,
    subtitleCount: Number(a.subtitles_count ?? 0),
    seasons: (Array.isArray(a.seasons) ? a.seasons : [])
      .map((season: Record<string, any>) => ({
        number: Number(season.season_number),
        episodes: (Array.isArray(season.episodes) ? season.episodes : [])
          .map((e: Record<string, any>) => ({
            number: Number(e.episode_number),
            title: String(e.title ?? ""),
            imdbId: imdbId(e.feature_imdb_id),
          }))
          .filter((e: { number: number }) => e.number > 0),
      }))
      .filter(
        (season: { number: number; episodes: unknown[] }) => season.number > 0 && season.episodes.length,
      ),
  };
}

async function features(
  params: URLSearchParams,
  fetchImpl: typeof fetch,
  searched?: Feature["kind"],
): Promise<Feature[]> {
  const response = await call(`${API}/features?${params}`, { headers: headers() }, fetchImpl);
  if (response.status === 429) throw new OpenSubtitlesError("errors.opensubtitles.searchLimited", 429);
  if (!response.ok)
    throw new OpenSubtitlesError("errors.opensubtitles.httpError", UPSTREAM_FAILED, {
      status: response.status,
    });
  const data = (await response.json()) as { data?: { attributes: Record<string, any> }[] };
  return (data.data ?? [])
    .map((f) => toFeature(f.attributes, searched))
    .filter((f): f is Feature => f !== null);
}

/** Films or shows whose title matches, in the catalogue's own order. */
export async function searchFeatures(
  query: string,
  kind: Feature["kind"],
  fetchImpl: typeof fetch = fetch,
): Promise<Feature[]> {
  return features(
    new URLSearchParams({ query, type: kind === "show" ? "tvshow" : "movie" }),
    fetchImpl,
    kind,
  );
}

export async function getFeature(id: string, fetchImpl: typeof fetch = fetch): Promise<Feature | null> {
  return (await features(new URLSearchParams({ feature_id: id }), fetchImpl))[0] ?? null;
}

export interface SubtitleSearch {
  language: string;
  /** A film's IMDb id, or an episode's own. */
  imdbId?: string;
  /** For an episode: the show's IMDb id, with season and episode numbers. */
  showImdbId?: string;
  season?: number;
  episode?: number;
  /** Free-text title, when no id is known. */
  query?: string;
}

export interface SubtitleFile {
  fileId: number;
  release: string;
  downloads: number;
  hearingImpaired: boolean;
}

const imdbNumber = (id: string) => String(Number(id.replace(/^tt/, "")));

export async function searchSubtitles(
  search: SubtitleSearch,
  fetchImpl: typeof fetch = fetch,
): Promise<SubtitleFile[]> {
  const params = new URLSearchParams({ languages: search.language, order_by: "download_count" });
  if (search.showImdbId && search.season !== undefined && search.episode !== undefined) {
    params.set("parent_imdb_id", imdbNumber(search.showImdbId));
    params.set("season_number", String(search.season));
    params.set("episode_number", String(search.episode));
  } else if (search.imdbId) {
    params.set("imdb_id", imdbNumber(search.imdbId));
  } else if (search.query) {
    params.set("query", search.query);
    if (search.season !== undefined) params.set("season_number", String(search.season));
    if (search.episode !== undefined) params.set("episode_number", String(search.episode));
  } else {
    return [];
  }

  const response = await call(`${API}/subtitles?${params}`, { headers: headers() }, fetchImpl);
  if (response.status === 429) {
    throw new OpenSubtitlesError("errors.opensubtitles.searchLimited", 429);
  }
  if (!response.ok)
    throw new OpenSubtitlesError("errors.opensubtitles.httpError", UPSTREAM_FAILED, {
      status: response.status,
    });
  const data = (await response.json()) as { data?: { attributes: Record<string, any> }[] };

  return (data.data ?? [])
    .map(({ attributes: a }) => ({
      fileId: Number(a.files?.[0]?.file_id),
      release: String(a.release ?? ""),
      downloads: Number(a.download_count ?? 0),
      hearingImpaired: Boolean(a.hearing_impaired),
      machine: Boolean(a.ai_translated || a.machine_translated),
    }))
    .filter((f) => Number.isFinite(f.fileId) && f.fileId > 0 && !f.machine)
    .map(({ machine: _machine, ...file }) => file)
    .toSorted((a, b) => Number(a.hearingImpaired) - Number(b.hearingImpaired) || b.downloads - a.downloads);
}

export async function downloadSubtitle(
  fileId: number,
  session: OpenSubtitlesSession,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await call(
    `${session.apiBase}/download`,
    { method: "POST", headers: headers(session.token), body: JSON.stringify({ file_id: fileId }) },
    fetchImpl,
  );
  if (response.status === 401) throw new OpenSubtitlesError("errors.opensubtitles.sessionExpired", 401);
  if (response.status === 406 || response.status === 429) {
    throw new OpenSubtitlesError("errors.opensubtitles.noDownloadsLeft", 429);
  }
  if (!response.ok)
    throw new OpenSubtitlesError("errors.opensubtitles.httpError", UPSTREAM_FAILED, {
      status: response.status,
    });
  const { link } = (await response.json()) as { link?: string };
  if (!link) throw new OpenSubtitlesError("errors.opensubtitles.badAnswer");
  const file = await call(link, {}, fetchImpl);
  if (!file.ok)
    throw new OpenSubtitlesError("errors.opensubtitles.httpError", UPSTREAM_FAILED, { status: file.status });
  return file.text();
}

/** One cached session per user, renewed on expiry or when OpenSubtitles says it's gone. */
export function createSessionCache(
  doLogin: (username: string, password: string) => Promise<OpenSubtitlesSession>,
  now: () => number = Date.now,
) {
  const sessions = new Map<string, OpenSubtitlesSession>();
  return {
    async get(userId: string, credentials: { username: string; password: string }, renew = false) {
      const cached = sessions.get(userId);
      if (cached && !renew && cached.expiresAt > now()) return cached;
      const session = await doLogin(credentials.username, credentials.password);
      sessions.set(userId, session);
      return session;
    },
    forget(userId: string) {
      sessions.delete(userId);
    },
  };
}

export const openSubtitlesSessions = createSessionCache(
  async (u, p) => (await openSubtitlesLogin(u, p)).session,
);
