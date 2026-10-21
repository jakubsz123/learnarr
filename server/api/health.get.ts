import { sql } from "drizzle-orm";
import { useDb } from "../db";

export default defineEventHandler((event) => {
  try {
    useDb().run(sql`select 1`);
    return { status: "ok" };
  } catch {
    setResponseStatus(event, 503);
    return { status: "unavailable" };
  }
});
