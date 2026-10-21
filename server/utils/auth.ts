import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import type { H3Event } from "h3";
import { eq } from "drizzle-orm";
import { useDb, schema, type Db } from "../db";
import { getOrCreateKey } from "./secrets";
import { trustedOrigins, useSecureCookies } from "./authOrigins";
import { ensureAdmin, signUpAllowed } from "./userAccess";

export function createAuth(db: Db) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret: getOrCreateKey("auth", "AUTH_SECRET"),
    baseURL: process.env.PUBLIC_URL || undefined,
    trustedOrigins: (request) => trustedOrigins(request),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: {
      useSecureCookies: useSecureCookies(),
      ipAddress: { disableIpTracking: true },
    },
    user: {
      additionalFields: {
        isAdmin: { type: "boolean", input: false, defaultValue: false },
        learningLanguage: { type: "string", input: false, defaultValue: "es" },
        nativeLanguage: { type: "string", input: false, defaultValue: "en" },
        level: { type: "string", input: false, defaultValue: "intermediate" },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!signUpAllowed(db)) {
              throw new APIError("FORBIDDEN", {
                message: "Sign-up is closed on this server. Ask its admin to add you.",
              });
            }
            return { data: user };
          },
          after: async () => {
            ensureAdmin(db);
          },
        },
      },
    },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;

export function useAuth() {
  auth ??= createAuth(useDb());
  return auth;
}

export type AppUser = typeof schema.user.$inferSelect;

/** The signed-in user's full row, or a 401. */
export async function requireUser(event: H3Event): Promise<AppUser> {
  const session = await useAuth().api.getSession({ headers: event.headers });
  const row = session && useDb().select().from(schema.user).where(eq(schema.user.id, session.user.id)).get();
  if (!row) throw createError({ statusCode: 401, statusMessage: "Sign in first." });
  return row;
}

export async function requireAdmin(event: H3Event): Promise<AppUser> {
  const user = await requireUser(event);
  if (!user.isAdmin) throw createError({ statusCode: 403, statusMessage: "Only the admin can do that." });
  return user;
}
