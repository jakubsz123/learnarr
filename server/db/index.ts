import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DATA_DIR } from "../utils/dataDir";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema> & { $client: Database.Database };

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.resolve(process.cwd(), "server/db/migrations");

/** Open a database and bring its schema up to date. `:memory:` gives a throwaway one for tests. */
export function openDb(file: string): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema }) as Db;
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

let shared: Db | undefined;

export function useDb(): Db {
  shared ??= openDb(path.join(DATA_DIR, "learnarr.db"));
  return shared;
}

/** Replace the shared database, for tests. */
export function setDbForTests(db: Db | undefined): void {
  shared = db;
}

export { schema };
