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
