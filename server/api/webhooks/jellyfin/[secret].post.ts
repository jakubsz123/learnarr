import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDb } from "~~/server/db";
import { AppError } from "~~/server/utils/errors";
import { jellyfinPlay, onPlay } from "~~/server/utils/notifications/playback";
import { useSettings } from "~~/server/utils/settings";
import { isWebhookSecret } from "~~/server/utils/webhooks";

/** Jellyfin's Webhook plugin posts playback starts here. */
export default defineEventHandler(async (event) => {
  if (!isWebhookSecret(useSettings(), getRouterParam(event, "secret") ?? "")) {
    throw new AppError(404, "errors.unknown");
  }
  const payload = await readBody(event).catch(() => null);
  const play =
    payload && typeof payload === "object" ? jellyfinPlay(payload as Record<string, unknown>) : null;
  if (play)
    void onPlay(useDb(), play).catch((error) => console.warn("[learnarr] play notification failed", error));
  return { ok: true };
});
