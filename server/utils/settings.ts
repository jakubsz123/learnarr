import { eq } from "drizzle-orm";
import { useDb, schema, type Db } from "../db";
import { decryptSecret, encryptSecret } from "./secrets";

/**
 * Every instance setting, its environment variable and whether it is secret.
 * Resolution is environment → database → default, so Docker users can pin a
 * value and everyone else sets it in the app.
 */
export const SETTINGS = {
  "media.kind": { env: "MEDIA_SERVER", secret: false },
  "media.url": { env: "MEDIA_SERVER_URL", secret: false },
  "media.token": { env: "MEDIA_SERVER_TOKEN", secret: true },
  "media.name": { env: undefined, secret: false },
  "ai.provider": { env: "AI_PROVIDER", secret: false },
  "ai.baseUrl": { env: "AI_BASE_URL", secret: false },
  "ai.apiKey": { env: "AI_API_KEY", secret: true },
  "ai.model": { env: "AI_MODEL", secret: false },
  /** The secret part of the webhook addresses media servers post plays to. */
  "webhook.secret": { env: undefined, secret: false },
} as const;

export type SettingKey = keyof typeof SETTINGS;

/** The settings that are saved together, from one form. */
export const SETTING_GROUPS = {
  media: ["media.kind", "media.url", "media.token", "media.name"],
  ai: ["ai.provider", "ai.baseUrl", "ai.apiKey", "ai.model"],
} as const satisfies Record<string, readonly SettingKey[]>;

export interface Settings {
  get(key: SettingKey): string | null;
  set(key: SettingKey, value: string | null): void;
  isFromEnv(key: SettingKey): boolean;
  /** Whether any setting of the group is pinned by an environment variable, so the app can't change it. */
  isPinned(group: keyof typeof SETTING_GROUPS): boolean;
}

export function createSettings(db: Db, env: NodeJS.ProcessEnv = process.env): Settings {
  const envValue = (key: SettingKey) => {
    const name = SETTINGS[key].env;
    return name ? env[name] || null : null;
  };
  return {
    get(key) {
      const fromEnv = envValue(key);
      if (fromEnv) return fromEnv;
      const row = db.select().from(schema.settings).where(eq(schema.settings.key, key)).get();
      if (!row) return null;
      return SETTINGS[key].secret ? decryptSecret(row.value) : row.value;
    },
    set(key, value) {
      if (value === null || value === "") {
        db.delete(schema.settings).where(eq(schema.settings.key, key)).run();
        return;
      }
      const stored = SETTINGS[key].secret ? encryptSecret(value) : value;
      db.insert(schema.settings)
        .values({ key, value: stored, updatedAt: new Date() })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value: stored, updatedAt: new Date() } })
        .run();
    },
    isFromEnv(key) {
      return envValue(key) !== null;
    },
    isPinned(group) {
      return SETTING_GROUPS[group].some((key) => envValue(key) !== null);
    },
  };
}

export function useSettings(): Settings {
  return createSettings(useDb());
}
