import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { UPLOAD_PREFIX } from "#shared/mediaSources";
import { parseSubtitle, toSrt, withoutSoundDescriptions } from "#shared/subtitles";
import { schema, type Db } from "../db";
import type { AppUser } from "./auth";
import { AppError } from "./errors";
import { candidateTracks } from "./media/tracks";
import type { MediaDetail, MediaServer } from "./media/types";
import {
  downloadSubtitle,
  OpenSubtitlesError,
  openSubtitlesSessions,
  requireOpenSubtitlesApiKey,
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

const liveCatalogue: CatalogueDeps = {
  search: (search) => searchSubtitles(requireOpenSubtitlesApiKey(), search),
  async download(fileId, userId, account) {
    const credentials = { ...account, apiKey: requireOpenSubtitlesApiKey() };
    const attempt = (session: OpenSubtitlesSession) => downloadSubtitle(fileId, session);
    try {
      return await attempt(await openSubtitlesSessions.get(userId, credentials));
    } catch (error) {
      if (error instanceof OpenSubtitlesError && error.statusCode === 401) {
        return attempt(await openSubtitlesSessions.get(userId, credentials, true));
      }
      throw error;
    }
  },
};

/** Store (or refresh) what Learnarr knows about a film or episode. */
function upsertMediaItem(db: Db, server: MediaServer, item: MediaDetail) {
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
    throw new AppError(400, "errors.subtitles.notPlayable");
  }
  const mediaItem = upsertMediaItem(db, server, item);

  const existing = findSubtitle(db, user.id, mediaItem.id, language);
  if (existing) return existing;
  const save = (raw: string, source: SubtitleSource) =>
    saveSubtitle(db, { userId: user.id, mediaItemId: mediaItem.id, language, source, raw });

  for (const track of candidateTracks(item.subtitleTracks, language)) {
    const raw = await server.subtitle(item, track).catch((error: Error) => {
      // One unreadable track isn't the end: the next one, or OpenSubtitles, may work.
      console.warn(`[learnarr] couldn't read subtitle track ${track.id} of ${item.id}: ${error.message}`);
      return null;
    });
    if (usable(raw)) return save(raw, server.kind);
  }

  if (!user.opensubtitlesUsername || !user.opensubtitlesPassword) {
    throw new AppError(
      404,
      server.kind === "opensubtitles"
        ? "errors.subtitles.needOpenSubtitles"
        : "errors.subtitles.noneOnServer",
      { language },
    );
  }
  const credentials = {
    username: user.opensubtitlesUsername,
    password: decryptSecret(user.opensubtitlesPassword),
  };

  const files = await catalogue.search(catalogueSearch(item, language));
  // Each download spends the person's daily quota, so stop at the first usable file.
  for (const file of files.slice(0, 3)) {
    const raw = await catalogue.download(file.fileId, user.id, credentials);
    if (usable(raw)) return save(raw, "opensubtitles");
  }
  throw new AppError(404, "errors.subtitles.noneAnywhere", { language });
}

export type SubtitleSource = (typeof schema.subtitles.$inferInsert)["source"];

/** Largest subtitle file accepted; a long film's SRT is well under 300 kB. */
export const MAX_SUBTITLE_BYTES = 2 * 1024 * 1024;

/**
 * Use a subtitle file the learner uploaded for a film or episode. It replaces
 * the one they had, keeping its cards, and is analysed again.
 */
export async function uploadSubtitle(opts: {
  db: Db;
  server: MediaServer;
  user: AppUser;
  serverItemId: string;
  raw: string;
}) {
  const { db, server, user } = opts;
  const item = await server.item(opts.serverItemId);
  if (item.type !== "movie" && item.type !== "episode")
    throw new AppError(400, "errors.subtitles.notPlayable");
  const cues = withoutSoundDescriptions(parseSubtitle(opts.raw));
  if (!cues.length) throw new AppError(400, "errors.subtitles.unreadable");
  const mediaItem = upsertMediaItem(db, server, item);
  const existing = findSubtitle(db, user.id, mediaItem.id, user.learningLanguage);
  if (!existing) {
    return saveSubtitle(db, {
      userId: user.id,
      mediaItemId: mediaItem.id,
      language: user.learningLanguage,
      source: "upload",
      raw: opts.raw,
    });
  }
  return db.transaction((tx) => {
    tx.delete(schema.subtitleLemmas).where(eq(schema.subtitleLemmas.subtitleId, existing.id)).run();
    return tx
      .update(schema.subtitles)
      .set({ source: "upload", content: toSrt(cues), cueCount: cues.length, updatedAt: new Date() })
      .where(eq(schema.subtitles.id, existing.id))
      .returning()
      .get();
  });
}

/**
 * Start from a subtitle file alone, for something that isn't on the media
 * server or in the catalogue: it becomes an item of the learner's own uploads,
 * under the title they gave it, in the language they're learning.
 */
export function addUpload(db: Db, user: AppUser, upload: { title: string; raw: string }) {
  const cues = withoutSoundDescriptions(parseSubtitle(upload.raw));
  if (!cues.length) throw new AppError(400, "errors.subtitles.unreadable");
  return db.transaction(() => {
    const mediaItem = db
      .insert(schema.mediaItems)
      .values({
        server: "upload",
        serverItemId: `${UPLOAD_PREFIX}${crypto.randomUUID()}`,
        kind: "movie",
        title: upload.title,
      })
      .returning()
      .get();
    const subtitle = saveSubtitle(db, {
      userId: user.id,
      mediaItemId: mediaItem.id,
      language: user.learningLanguage,
      source: "upload",
      raw: upload.raw,
    });
    return { mediaItem, subtitle };
  });
}

function findSubtitle(db: Db, userId: string, mediaItemId: number, language: string) {
  return db
    .select()
    .from(schema.subtitles)
    .where(
      and(
        eq(schema.subtitles.userId, userId),
        eq(schema.subtitles.mediaItemId, mediaItemId),
        eq(schema.subtitles.language, language),
      ),
    )
    .get();
}

/**
 * Store a subtitle for a learner, cleaned up and as SRT. If one was saved in
 * the meantime (two taps at once), that one is kept.
 */
function saveSubtitle(
  db: Db,
  input: { userId: string; mediaItemId: number; language: string; source: SubtitleSource; raw: string },
) {
  const cues = withoutSoundDescriptions(parseSubtitle(input.raw));
  const saved = db
    .insert(schema.subtitles)
    .values({
      userId: input.userId,
      mediaItemId: input.mediaItemId,
      language: input.language,
      source: input.source,
      content: toSrt(cues),
      cueCount: cues.length,
    })
    .onConflictDoNothing()
    .returning()
    .get();
  return saved ?? findSubtitle(db, input.userId, input.mediaItemId, input.language)!;
}
