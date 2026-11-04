import { trustedOrigins } from "./authOrigins";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Whether a request may change something. Session cookies are SameSite=Lax,
 * which treats every port and subdomain of a host as the same site, so another
 * web app on the same server (Sonarr on :8989, say) could otherwise post to
 * Learnarr with the user's cookie. A browser says where a request comes from in
 * `Origin` (and `Sec-Fetch-Site`); it must be the host the request was sent to,
 * or one of the trusted origins. Requests without either header don't come from
 * a browser page, and carry no cookie unless their sender has the session.
 */
export function isAllowedOrigin(request: {
  method: string;
  host: string | null;
  origin: string | null;
  fetchSite: string | null;
}): boolean {
  if (SAFE_METHODS.has(request.method)) return true;
  if (request.fetchSite === "same-origin" || request.fetchSite === "none") return true;
  if (!request.origin) return request.fetchSite === null;
  let origin: URL;
  try {
    origin = new URL(request.origin);
  } catch {
    return false;
  }
  // The scheme is left out on purpose: behind a TLS proxy Learnarr sees http
  // while the browser says https, and the host alone is what tells sites apart.
  if (request.host && origin.host === request.host) return true;
  return trustedOrigins(undefined).some((trusted) => {
    try {
      return new URL(trusted).host === origin.host;
    } catch {
      return false;
    }
  });
}
