import { and, eq } from "drizzle-orm";
import { schema, type Db } from "../db";
import { AppError } from "./errors";

/** The subtitle if it is this user's, else a 404 (whether it exists or not). */
export function ownSubtitle(db: Db, userId: string, id: number) {
  const subtitle = db
    .select()
    .from(schema.subtitles)
    .where(and(eq(schema.subtitles.id, id), eq(schema.subtitles.userId, userId)))
    .get();
  if (!subtitle) throw new AppError(404, "errors.subtitles.notInLibrary");
  return subtitle;
}
