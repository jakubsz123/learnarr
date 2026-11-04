import { defineEventHandler } from "h3";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { validBody } from "~~/server/utils/validate";

/**
 * The push services browsers use. Learnarr posts to a subscription's address,
 * so it only accepts these, never an address on the local network.
 */
const PUSH_SERVICES = [
  "fcm.googleapis.com", // Chrome, Edge, Android
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com", // Safari, iOS
  ".notify.windows.com", // Windows
];

const body = z.object({
  endpoint: z
    .url({ protocol: /^https$/ })
    .max(1000)
    .refine((url) => {
      const host = new URL(url).hostname;
      return PUSH_SERVICES.some((s) => (s.startsWith(".") ? host.endsWith(s) : host === s));
    }),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Turn push on for this browser: keep the subscription it made. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { endpoint, keys } = await validBody(event, body);
  const values = { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth };
  useDb()
    .insert(schema.pushSubscriptions)
    .values(values)
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: values })
    .run();
  return { subscribed: true };
});
