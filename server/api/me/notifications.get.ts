import { count, eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { reminderHour } from "~~/server/utils/notifications/reminders";
import { vapidKeys } from "~~/server/utils/notifications/push";

/** The person's notification settings, and the key a browser needs to subscribe to push. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const devices =
    useDb()
      .select({ n: count() })
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, user.id))
      .get()?.n ?? 0;
  return {
    pushKey: vapidKeys().publicKey,
    pushDevices: devices,
    ntfyTopic: user.ntfyTopic,
    ntfyServer: (process.env.NTFY_URL ?? "https://ntfy.sh").replace(/\/+$/, ""),
    practiceReminders: user.practiceReminders,
    watchReminders: user.watchReminders,
    mediaServerUser: user.mediaServerUser,
    reminderHour: reminderHour(),
  };
});
