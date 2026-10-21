import { eq } from "drizzle-orm";
import { createError } from "h3";
import { schema, type Db } from "../db";

/** The subtitle if it is this user's, else a 404 (whether it exists or not). */
export function ownSubtitle(db: Db, userId: string, id: number) {
  const subtitle = db.select().from(schema.subtitles).where(eq(schema.subtitles.id, id)).get();
  if (!subtitle || subtitle.userId !== userId) {
    throw createError({ statusCode: 404, statusMessage: "That subtitle isn't in your library." });
  }
  return subtitle;
}
