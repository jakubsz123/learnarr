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
} as const;

export type SettingKey = keyof typeof SETTINGS;

export interface Settings {
  get(key: SettingKey): string | null;
  set(key: SettingKey, value: string | null): void;
  isFromEnv(key: SettingKey): boolean;
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
  };
}

export function useSettings(): Settings {
  return createSettings(useDb());
}
