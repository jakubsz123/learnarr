import { sql } from "drizzle-orm";
import { defineEventHandler, setResponseStatus } from "h3";
import { useDb } from "~~/server/db";

/** Public: 200 while the database answers. The Docker healthcheck calls it. */
export default defineEventHandler((event) => {
  try {
    useDb().run(sql`select 1`);
    return { status: "ok" };
  } catch {
    setResponseStatus(event, 503);
    return { status: "unavailable" };
  }
});
