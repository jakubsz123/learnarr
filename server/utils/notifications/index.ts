import { count, eq } from "drizzle-orm";
import { schema, type Db } from "../../db";
import { sendNtfy } from "./ntfy";
import { sendPush, type PushMessage } from "./push";

/**
 * Tell a person something on every channel they set up: push to their devices
 * and their ntfy topic. Returns whether anything was sent; a channel that fails
 * is logged and the others still go.
 */
export async function notifyUser(db: Db, userId: string, message: PushMessage): Promise<boolean> {
  const user = db.select().from(schema.user).where(eq(schema.user.id, userId)).get();
  if (!user) return false;
  let sent = (await sendPush(db, userId, message)) > 0;
  if (user.ntfyTopic) {
    try {
      await sendNtfy(user.ntfyTopic, message);
      sent = true;
    } catch (error) {
      console.warn(`[learnarr] ntfy for ${userId} failed: ${(error as Error).message}`);
    }
  }
  return sent;
}

/** Whether a person has set up any way to be notified: a device with push on, or an ntfy topic. */
export function hasNotificationChannel(db: Db, user: { id: string; ntfyTopic: string | null }): boolean {
  if (user.ntfyTopic) return true;
  const devices =
    db
      .select({ n: count() })
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, user.id))
      .get()?.n ?? 0;
  return devices > 0;
}
