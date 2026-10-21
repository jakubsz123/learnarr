import { AsyncLocalStorage } from "node:async_hooks";
import { asc, count, eq } from "drizzle-orm";
import { schema, type Db } from "../db";

/** Sign-up is open only while the server has no accounts: the first one is the admin. */
export function signUpAllowed(db: Db): boolean {
  return countUsers(db) === 0 || isAdminCreatingAccount();
}

export function countUsers(db: Db): number {
  return db.select({ n: count() }).from(schema.user).get()?.n ?? 0;
}

/** Make the oldest account admin if nobody is. Returns the promoted id, if any. */
export function ensureAdmin(db: Db): string | null {
  const hasAdmin = db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.isAdmin, true))
    .get();
  if (hasAdmin) return null;
  const oldest = db
    .select({ id: schema.user.id })
    .from(schema.user)
    .orderBy(asc(schema.user.createdAt))
    .get();
  if (!oldest) return null;
  db.update(schema.user).set({ isAdmin: true }).where(eq(schema.user.id, oldest.id)).run();
  return oldest.id;
}

// The admin adding a household member still goes through better-auth's sign-up
// (password hashing, the account row). Scoping the permission to that call's
// async context, rather than a flag, keeps a stranger's simultaneous sign-up out.
const adminCreation = new AsyncLocalStorage<true>();

export function asAdminCreatingAccount<T>(fn: () => Promise<T>): Promise<T> {
  return adminCreation.run(true, fn);
}

export function isAdminCreatingAccount(): boolean {
  return adminCreation.getStore() === true;
}
