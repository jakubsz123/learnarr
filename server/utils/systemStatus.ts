import fs from "node:fs";
import path from "node:path";
import { count, isNull } from "drizzle-orm";
import { schema, type Db } from "../db";
import { DATA_DIR } from "./dataDir";
import { listModels } from "./ai/client";
import { resolveAiConfig } from "./ai/config";
import { createMediaServer } from "./media";
import type { Settings } from "./settings";

export type CheckState = "ok" | "warning" | "error";

export interface Check {
  name: string;
  state: CheckState;
  detail: string;
  /** The screen that fixes it. */
  fix?: string;
}

const TIMEOUT_MS = 8000;

function within<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("didn't answer in time")), TIMEOUT_MS)),
  ]);
}

async function mediaCheck(settings: Settings): Promise<Check> {
  const kind = settings.get("media.kind");
  const url = settings.get("media.url");
  const token = settings.get("media.token");
  if ((kind !== "plex" && kind !== "jellyfin") || !url || !token) {
    return { name: "Media server", state: "error", detail: "Not connected.", fix: "/settings/media-server" };
  }
  const label = kind === "plex" ? "Plex" : "Jellyfin";
  try {
    const { name, version } = await within(createMediaServer(kind, url, token).identify());
    return { name: `Media server · ${label}`, state: "ok", detail: `${name} ${version}` };
  } catch (error) {
    return {
      name: `Media server · ${label}`,
      state: "error",
      detail: (error as Error).message,
      fix: "/settings/media-server",
    };
  }
}

async function aiCheck(settings: Settings): Promise<Check> {
  const config = resolveAiConfig(settings);
  if (!config) return { name: "AI provider", state: "error", detail: "Not set up.", fix: "/settings/ai" };
  try {
    await within(listModels(config));
    return { name: "AI provider", state: "ok", detail: `${config.model} at ${config.baseUrl}` };
  } catch (error) {
    return { name: "AI provider", state: "error", detail: (error as Error).message, fix: "/settings/ai" };
  }
}

export async function systemStatus(db: Db, settings: Settings) {
  const [media, ai] = await Promise.all([mediaCheck(settings), aiCheck(settings)]);
  const withoutOs =
    db.select({ n: count() }).from(schema.user).where(isNull(schema.user.opensubtitlesPassword)).get()?.n ??
    0;
  const opensubtitles: Check =
    withoutOs === 0
      ? { name: "OpenSubtitles accounts", state: "ok", detail: "Everyone has connected one." }
      : {
          name: "OpenSubtitles accounts",
          state: "warning",
          detail: `${withoutOs} ${withoutOs === 1 ? "person hasn't" : "people haven't"} connected an account, so they only get subtitles the media server has.`,
          fix: "/settings/account",
        };

  let databaseBytes: number | null = null;
  try {
    databaseBytes = fs.statSync(path.join(DATA_DIR, "learnarr.db")).size;
  } catch {
    databaseBytes = null;
  }

  return {
    checks: [media, ai, opensubtitles],
    about: {
      version: process.env.npm_package_version ?? "0.1.0",
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
