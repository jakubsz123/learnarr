import { z } from "zod";
import { defineEventHandler, readMultipartFormData } from "h3";
import { useDb } from "~~/server/db";
import { AppError } from "~~/server/utils/errors";
import { onPlay, plexPlay } from "~~/server/utils/notifications/playback";
import { useSettings } from "~~/server/utils/settings";
import { validParams } from "~~/server/utils/validate";
import { isWebhookSecret } from "~~/server/utils/webhooks";

/** Plex posts every play here (Settings → Webhooks in Plex, with Plex Pass). */
export default defineEventHandler(async (event) => {
  // A wrong secret looks like an address that doesn't exist.
  const { secret } = validParams(event, z.object({ secret: z.string().max(200) }));
  if (!isWebhookSecret(useSettings(), secret)) throw new AppError(404, "errors.notFound");
  const form = await readMultipartFormData(event).catch(() => undefined);
  const field = form?.find((part) => part.name === "payload");
  let payload: unknown;
  try {
    payload = field ? JSON.parse(field.data.toString("utf8")) : null;
  } catch {
    payload = null;
  }
  const play = payload && typeof payload === "object" ? plexPlay(payload as Record<string, unknown>) : null;
  // Answer at once: Plex doesn't wait, and a slow notification mustn't hold up its queue.
  if (play)
    void onPlay(useDb(), play).catch((error) => console.warn("[learnarr] play notification failed", error));
  return { ok: true };
});
