import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { validBody } from "~~/server/utils/validate";

const body = z.object({
  // ntfy topics are letters, digits, - and _; an empty one turns ntfy off.
  ntfyTopic: z
    .string()
    .trim()
    .max(64)
    .regex(/^[\w-]*$/)
    .optional(),
  practiceReminders: z.boolean().optional(),
  watchReminders: z.boolean().optional(),
  mediaServerUser: z.string().trim().max(100).optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { ntfyTopic, mediaServerUser, ...flags } = await validBody(event, body);
  useDb()
    .update(schema.user)
    .set({
      ...flags,
      ...(ntfyTopic !== undefined ? { ntfyTopic: ntfyTopic || null } : {}),
      ...(mediaServerUser !== undefined ? { mediaServerUser: mediaServerUser || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.user.id, user.id))
    .run();
  return { saved: true };
});
