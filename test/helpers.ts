import { openDb, schema, type Db } from "../server/db";
import { setEncryptionKeyForTests } from "../server/utils/secrets";
import type { AppUser } from "../server/utils/auth";

setEncryptionKeyForTests("test-key");

export function testDb(): Db {
  return openDb(":memory:");
}

export function addUser(db: Db, overrides: Partial<AppUser> = {}): AppUser {
  return db
    .insert(schema.user)
    .values({
      id: overrides.id ?? `u-${Math.random().toString(36).slice(2)}`,
      name: "Test",
      email: `${Math.random().toString(36).slice(2)}@example.com`,
      ...overrides,
    })
    .returning()
    .get();
}

/** SRT with `n` lines of dialogue. */
export function srtWith(n: number, line = (i: number) => `Línea número ${i}`): string {
  return Array.from({ length: n }, (_, i) => {
    const s = String(i + 1).padStart(2, "0");
    return `${i + 1}\n00:00:${s},000 --> 00:00:${s},900\n${line(i)}\n`;
  }).join("\n");
}
