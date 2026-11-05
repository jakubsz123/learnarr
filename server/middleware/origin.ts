import { defineEventHandler, getRequestHeader } from "h3";
import { AppError } from "../utils/errors";
import { isAllowedOrigin } from "../utils/requestOrigin";

/** Refuse writes to the API that come from another site's page (see isAllowedOrigin). */
export default defineEventHandler((event) => {
  const path = event.path;
  // better-auth checks its own routes; webhooks come from media servers, not browsers.
  if (!path.startsWith("/api/") || path.startsWith("/api/auth/") || path.startsWith("/api/webhooks/")) return;
  const allowed = isAllowedOrigin({
    method: event.method,
    // Proxies in a chain append to x-forwarded-host; the first entry is the address the browser used.
    host:
      getRequestHeader(event, "x-forwarded-host")?.split(",")[0]?.trim() ??
      getRequestHeader(event, "host") ??
      null,
    origin: getRequestHeader(event, "origin") ?? null,
    fetchSite: getRequestHeader(event, "sec-fetch-site") ?? null,
  });
  if (!allowed) throw new AppError(403, "errors.crossSite");
});
