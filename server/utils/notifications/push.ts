import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { schema, type Db } from "../../db";
import { DATA_DIR } from "../dataDir";

/**
 * Web push: notifications to a browser or an installed home-screen app, with
 * no app store and no account anywhere. The server signs them with a key pair
 * (VAPID) made on first use and kept in /config/push.json, like the other keys.
 */

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let keys: VapidKeys | undefined;

export function vapidKeys(dir = DATA_DIR): VapidKeys {
  if (keys) return keys;
  const file = path.join(dir, "push.json");
  try {
    keys = JSON.parse(fs.readFileSync(file, "utf8")) as VapidKeys;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const fresh = webpush.generateVAPIDKeys();
    fs.mkdirSync(dir, { recursive: true });
    try {
      fs.writeFileSync(file, JSON.stringify(fresh), { mode: 0o600, flag: "wx" });
      keys = fresh;
    } catch (writeError) {
      // Another process made them first: use theirs.
      if ((writeError as NodeJS.ErrnoException).code !== "EEXIST") throw writeError;
      keys = JSON.parse(fs.readFileSync(file, "utf8")) as VapidKeys;
    }
  }
  return keys;
}

export interface PushMessage {
  title: string;
  body: string;
  /** The page to open when the notification is tapped. */
  url: string;
}

/**
 * Send to every device the user turned push on in. A device that's gone (the
 * browser forgot it, the app was removed) answers 404 or 410 and is forgotten.
 * Returns how many devices it reached.
 */
export async function sendPush(
  db: Db,
  userId: string,
  message: PushMessage,
  send = webpush.sendNotification,
) {
  const { publicKey, privateKey } = vapidKeys();
  const subject = process.env.PUBLIC_URL || "mailto:learnarr@localhost";
  const devices = db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId))
    .all();
  let reached = 0;
  for (const device of devices) {
    try {
      await send(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        JSON.stringify(message),
        { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 12 },
      );
      reached++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, device.id)).run();
      } else {
        console.warn(`[learnarr] push to a device of ${userId} failed: ${(error as Error).message}`);
      }
    }
  }
  return reached;
}
