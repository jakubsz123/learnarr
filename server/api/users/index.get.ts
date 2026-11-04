import { asc } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { schema, useDb } from "~~/server/db";
import { requireAdmin } from "~~/server/utils/auth";

/** Everyone with an account on this server. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const users = useDb()
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      isAdmin: schema.user.isAdmin,
      learningLanguage: schema.user.learningLanguage,
      opensubtitlesUsername: schema.user.opensubtitlesUsername,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(asc(schema.user.createdAt))
    .all();
  return {
    users: users.map(({ opensubtitlesUsername, ...u }) => ({
      ...u,
      opensubtitles: Boolean(opensubtitlesUsername),
    })),
  };
});
