import crypto from "node:crypto";
import type { Settings } from "./settings";

/**
 * The secret in the webhook addresses (/api/webhooks/plex/<secret>). Media
 * servers can't sign in, so knowing the address is what lets a play through;
 * it's made on first use and shown to the admin with the addresses.
 */
export function webhookSecret(settings: Settings): string {
  let secret = settings.get("webhook.secret");
  if (!secret) {
    secret = crypto.randomBytes(24).toString("base64url");
    settings.set("webhook.secret", secret);
  }
  return secret;
}

export function isWebhookSecret(settings: Settings, given: string): boolean {
  const secret = settings.get("webhook.secret");
  if (!secret || secret.length !== given.length) return false;
  return crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(given));
}
