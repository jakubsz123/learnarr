import { and, eq } from "drizzle-orm";
import { createError } from "h3";
import { languageName } from "#shared/languages";
import { parseSubtitle, toSrt, withoutSoundDescriptions } from "#shared/subtitles";
import { schema, type Db } from "../db";
import type { AppUser } from "./auth";
import { candidateTracks } from "./media/tracks";
import type { MediaDetail, MediaServer } from "./media/types";
import {
  downloadSubtitle,
  OpenSubtitlesError,
  openSubtitlesSessions,
  searchSubtitles,
  type OpenSubtitlesSession,
  type SubtitleFile,
  type SubtitleSearch,
} from "./opensubtitles";
import { decryptSecret } from "./secrets";

/** A subtitle with fewer lines than this is a forced or broken track, not dialogue. */
const MIN_CUES = 20;

const usable = (raw: string | null): raw is string => !!raw && parseSubtitle(raw).length >= MIN_CUES;

export interface CatalogueDeps {
  search(search: SubtitleSearch): Promise<SubtitleFile[]>;
  download(
    fileId: number,
    userId: string,
    credentials: { username: string; password: string },
  ): Promise<string>;
}

export const liveCatalogue: CatalogueDeps = {
  search: (search) => searchSubtitles(search),
  async download(fileId, userId, credentials) {
    const attempt = (session: OpenSubtitlesSession) => downloadSubtitle(fileId, session);
    try {
      return await attempt(await openSubtitlesSessions.get(userId, credentials));
    } catch (error) {
      if (error instanceof OpenSubtitlesError && error.status === 401) {
        return attempt(await openSubtitlesSessions.get(userId, credentials, true));
      }
      throw error;
    }
  },
};

/** Store (or refresh) what Learnarr knows about a film or episode. */
export function upsertMediaItem(db: Db, server: MediaServer, item: MediaDetail) {
  const values = {
    server: server.kind,
    serverItemId: item.id,
    kind: item.type === "episode" ? ("episode" as const) : ("movie" as const),
    title: item.title,
    showTitle: item.showTitle ?? null,
    seasonNumber: item.seasonNumber ?? null,
    episodeNumber: item.episodeNumber ?? null,
    year: item.year ?? null,
    imdbId: item.imdbId ?? null,
    showImdbId: item.showImdbId ?? null,
    updatedAt: new Date(),
  };
  return db
    .insert(schema.mediaItems)
    .values(values)
    .onConflictDoUpdate({ target: [schema.mediaItems.server, schema.mediaItems.serverItemId], set: values })
    .returning()
    .get();
}

function catalogueSearch(item: MediaDetail, language: string): SubtitleSearch {
  if (item.type === "episode") {
    return {
      language,
      showImdbId: item.showImdbId,
      imdbId: item.imdbId,
      season: item.seasonNumber,
      episode: item.episodeNumber,
      query: item.showTitle,
    };
  }
  return { language, imdbId: item.imdbId, query: item.year ? `${item.title} ${item.year}` : item.title };
}

/**
 * The user's subtitle for an item in their learning language: the one they
 * already have, else the media server's best text track, else a download from
 * OpenSubtitles.com with their own account.
 */
export async function getSubtitle(opts: {
  db: Db;
  server: MediaServer;
  user: AppUser;
  serverItemId: string;
  catalogue?: CatalogueDeps;
}) {
  const { db, server, user } = opts;
  const catalogue = opts.catalogue ?? liveCatalogue;
  const language = user.learningLanguage;

  const item = await server.item(opts.serverItemId);
  if (item.type !== "movie" && item.type !== "episode") {
    throw createError({ statusCode: 400, statusMessage: "Pick a film or an episode." });
  }
  const mediaItem = upsertMediaItem(db, server, item);

  const existing = db
    .select()
    .from(schema.subtitles)
    .where(
      and(
        eq(schema.subtitles.userId, user.id),
        eq(schema.subtitles.mediaItemId, mediaItem.id),
        eq(schema.subtitles.language, language),
      ),
    )
    .get();
  if (existing) return existing;

  const save = (raw: string, source: "plex" | "jellyfin" | "opensubtitles") => {
    const cues = withoutSoundDescriptions(parseSubtitle(raw));
    return db
      .insert(schema.subtitles)
      .values({
        userId: user.id,
        mediaItemId: mediaItem.id,
        language,
        source,
        content: toSrt(cues),
        cueCount: cues.length,
      })
      .returning()
      .get();
  };

  for (const track of candidateTracks(item.subtitleTracks, language)) {
    const raw = await server.subtitle(item, track).catch(() => null);
    if (usable(raw)) return save(raw, server.kind);
  }

  const name = languageName(language);
  if (!user.opensubtitlesUsername || !user.opensubtitlesPassword) {
    throw createError({
      statusCode: 404,
      statusMessage: `Your media server has no ${name} subtitle for this. Connect your OpenSubtitles.com account in Settings → Account to download one.`,
    });
  }
  const credentials = {
    username: user.opensubtitlesUsername,
    password: decryptSecret(user.opensubtitlesPassword),
  };

  try {
    const files = await catalogue.search(catalogueSearch(item, language));
    // Each download spends the person's daily quota, so stop at the first usable file.
    for (const file of files.slice(0, 3)) {
      const raw = await catalogue.download(file.fileId, user.id, credentials);
      if (usable(raw)) return save(raw, "opensubtitles");
    }
  } catch (error) {
    if (error instanceof OpenSubtitlesError) {
      throw createError({ statusCode: error.status === 429 ? 429 : 502, statusMessage: error.message });
    }
    throw error;
  }
  throw createError({
    statusCode: 404,
    statusMessage: `Neither your media server nor OpenSubtitles.com has a ${name} subtitle for this.`,
  });
}
