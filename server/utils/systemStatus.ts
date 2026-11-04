import fs from "node:fs";
import path from "node:path";
import { count, isNull } from "drizzle-orm";
import { schema, type Db } from "../db";
import { DATA_DIR } from "./dataDir";
import { listModels } from "./ai/client";
import { resolveAiConfig } from "./ai/config";
import { createMediaServer, mediaServerSettings } from "./media";
import type { Settings } from "./settings";
import { frequencyRanks } from "./frequency";
import type { Lemmas, ModelStatus } from "./lemmas";
import { UDPIPE_BIN } from "./lemmas/models";
import type { ErrorKey, MessageParams } from "#shared/messages";
import { VERSION } from "#shared/version";
import { AppError } from "./errors";

export type CheckState = "ok" | "warning" | "error";

/**
 * One health check. The page words it from `id`, `state` and `params` (under
 * status.checks in the message catalog); `error` is why it failed, when a
 * service said so.
 */
export interface Check {
  id: "media" | "ai" | "opensubtitles" | "lemmatiser";
  state: CheckState;
  params: Record<string, string | number>;
  error?: { key: ErrorKey; params: MessageParams; message: string };
  /** The screen that fixes it. */
  fix?: string;
}

const TIMEOUT_MS = 8000;

function within<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new AppError(504, "errors.timedOut")), TIMEOUT_MS)),
  ]);
}

function failure(error: unknown): Check["error"] {
  return error instanceof AppError && error.data
    ? { key: error.data.key, params: error.data.params, message: error.message }
    : { key: "errors.unknown", params: {}, message: (error as Error).message };
}

async function mediaCheck(settings: Settings): Promise<Check> {
  const connection = mediaServerSettings(settings);
  if (!connection) return { id: "media", state: "error", params: {}, fix: "/settings/media-server" };
  const server = connection.kind === "plex" ? "Plex" : "Jellyfin";
  try {
    const { name, version } = await within(
      createMediaServer(connection.kind, connection.url, connection.token).identify(),
    );
    return { id: "media", state: "ok", params: { server, name, version } };
  } catch (error) {
    return {
      id: "media",
      state: "error",
      params: { server },
      error: failure(error),
      fix: "/settings/media-server",
    };
  }
}

async function aiCheck(settings: Settings): Promise<Check> {
  const config = resolveAiConfig(settings);
  if (!config) return { id: "ai", state: "error", params: {}, fix: "/settings/ai" };
  try {
    await within(listModels(config));
    return { id: "ai", state: "ok", params: { model: config.model, address: config.baseUrl } };
  } catch (error) {
    return { id: "ai", state: "error", params: {}, error: failure(error), fix: "/settings/ai" };
  }
}

function openSubtitlesCheck(db: Db): Check {
  const without =
    db.select({ n: count() }).from(schema.user).where(isNull(schema.user.opensubtitlesPassword)).get()?.n ??
    0;
  return without === 0
    ? { id: "opensubtitles", state: "ok", params: {} }
    : { id: "opensubtitles", state: "warning", params: { count: without }, fix: "/settings/account" };
}

function engineCheck(lemmas: Pick<Lemmas, "hasEngine">): Check {
  return { id: "lemmatiser", state: lemmas.hasEngine() ? "ok" : "warning", params: { path: UDPIPE_BIN } };
}

export interface LanguageRow {
  code: string;
  learners: number;
  model: ModelStatus;
  frequencyList: boolean;
}

/** The languages people here are learning, and whether their lemmatiser model and word list are in place. */
async function languages(db: Db, lemmas: Pick<Lemmas, "modelStatus">): Promise<LanguageRow[]> {
  const rows = db
    .select({ code: schema.user.learningLanguage, learners: count() })
    .from(schema.user)
    .groupBy(schema.user.learningLanguage)
    .all();
  return Promise.all(
    rows.map(async (row) => ({
      code: row.code,
      learners: row.learners,
      model: lemmas.modelStatus(row.code),
      frequencyList: (await frequencyRanks(row.code)) !== null,
    })),
  );
}

export async function systemStatus(
  db: Db,
  settings: Settings,
  lemmas: Pick<Lemmas, "hasEngine" | "modelStatus">,
) {
  const [media, ai] = await Promise.all([mediaCheck(settings), aiCheck(settings)]);

  let databaseBytes: number | null = null;
  try {
    databaseBytes = fs.statSync(path.join(DATA_DIR, "learnarr.db")).size;
  } catch {
    databaseBytes = null;
  }

  return {
    checks: [media, ai, openSubtitlesCheck(db), engineCheck(lemmas)],
    languages: await languages(db, lemmas),
    about: {
      version: VERSION,
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      dataDir: DATA_DIR,
      databaseBytes,
      users: db.select({ n: count() }).from(schema.user).get()?.n ?? 0,
      cards: db.select({ n: count() }).from(schema.cards).get()?.n ?? 0,
      uptimeSeconds: Math.round(process.uptime()),
    },
  };
}
