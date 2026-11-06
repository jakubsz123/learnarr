import crypto from "node:crypto";
import { and, asc, eq, gt, lte } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { schema, type Db } from "../db";
import type { useAuth } from "./auth";
import { AppError } from "./errors";
import { asAdminCreatingAccount } from "./userAccess";

/** How long a link works. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Make an invite link's token. Without `userId` it lets someone create an
 * account; with it, set a new password for that account. The token is shown
 * once and can't be found again.
 */
export function createInvite(db: Db, adminId: string, userId?: string, now = Date.now()) {
  const token = crypto.randomBytes(24).toString("base64url");
  const invite = db
    .insert(schema.invites)
    .values({
      id: crypto.randomUUID(),
      tokenHash: hash(token),
      userId: userId ?? null,
      createdBy: adminId,
      expiresAt: new Date(now + INVITE_TTL_MS),
    })
    .returning()
    .get();
  return { id: invite.id, token, expiresAt: invite.expiresAt };
}

/** The invite a token belongs to, if it's still good, with the name of the account it resets. */
export function findInvite(db: Db, token: string, now = Date.now()) {
  db.delete(schema.invites)
    .where(lte(schema.invites.expiresAt, new Date(now)))
    .run();
  const row = db
    .select({ invite: schema.invites, name: schema.user.name })
    .from(schema.invites)
    .leftJoin(schema.user, eq(schema.invites.userId, schema.user.id))
    .where(and(eq(schema.invites.tokenHash, hash(token)), gt(schema.invites.expiresAt, new Date(now))))
    .get();
  return row ? { ...row.invite, name: row.name } : null;
}

/** The invites still waiting to be used, oldest first, with who each resets. */
export function pendingInvites(db: Db, now = Date.now()) {
  return db
    .select({
      id: schema.invites.id,
      userId: schema.invites.userId,
      name: schema.user.name,
      expiresAt: schema.invites.expiresAt,
    })
    .from(schema.invites)
    .leftJoin(schema.user, eq(schema.invites.userId, schema.user.id))
    .where(gt(schema.invites.expiresAt, new Date(now)))
    .orderBy(asc(schema.invites.createdAt))
    .all();
}

export interface InviteAnswer {
  name?: string;
  email?: string;
  password: string;
}

/**
 * Use an invite: create the account, or set the new password. The invite is
 * claimed first so two people can't use one link, and put back if it fails.
 * Answers with the email to sign in with.
 */
export async function acceptInvite(
  db: Db,
  auth: ReturnType<typeof useAuth>,
  token: string,
  answer: InviteAnswer,
  now = Date.now(),
): Promise<{ email: string }> {
  const invite = findInvite(db, token, now);
  if (!invite) throw new AppError(404, "errors.invites.invalid");
  const { name: _name, ...row } = invite;
  const claimed = db.delete(schema.invites).where(eq(schema.invites.id, invite.id)).run().changes;
  if (!claimed) throw new AppError(404, "errors.invites.invalid");

  try {
    if (row.userId) return await resetPassword(db, auth, row.userId, answer.password);
    if (!answer.name || !answer.email) throw new AppError(400, "errors.invites.needDetails");
    const { name, email, password } = { ...answer, name: answer.name, email: answer.email };
    await asAdminCreatingAccount(() => auth.api.signUpEmail({ body: { name, email, password } }));
    return { email };
  } catch (error) {
    db.insert(schema.invites).values(row).run();
    if (error instanceof AppError) throw error;
    if (error instanceof APIError && error.body?.code?.startsWith("USER_ALREADY_EXISTS"))
      throw new AppError(400, "errors.users.emailTaken");
    throw error;
  }
}

async function resetPassword(db: Db, auth: ReturnType<typeof useAuth>, userId: string, password: string) {
  const account = db.select().from(schema.user).where(eq(schema.user.id, userId)).get();
  if (!account) throw new AppError(404, "errors.users.notFound");
  const context = await auth.$context;
  await context.internalAdapter.updatePassword(userId, await context.password.hash(password));
  // Anyone signed in with the old password is signed out.
  db.delete(schema.session).where(eq(schema.session.userId, userId)).run();
  return { email: account.email };
}
