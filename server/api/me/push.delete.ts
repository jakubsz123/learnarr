import { and, eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { validBody } from "~~/server/utils/validate";

const body = z.object({ endpoint: z.string().max(1000) });

/** Turn push off for this browser. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { endpoint } = await validBody(event, body);
  useDb()
    .delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, user.id), eq(schema.pushSubscriptions.endpoint, endpoint)))
    .run();
  return { subscribed: false };
});
