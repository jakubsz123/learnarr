/**
 * A container with no configuration is reached as http://<lan-ip>:<port>, the
 * way every *arr app is. So the origin a request was actually made to is
 * trusted (a page posting to the host that served it is same-origin), and
 * session cookies are Secure only when the configured public URL is https;
 * otherwise a browser on plain HTTP would drop them.
 */

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function trustedOrigins(request: Request | undefined, env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = new Set<string>();
  for (const origin of (env.TRUSTED_ORIGINS ?? "").split(",")) {
    if (origin.trim()) origins.add(origin.trim());
  }
  const publicOrigin = originOf(env.PUBLIC_URL);
  if (publicOrigin) origins.add(publicOrigin);
  const own = originOf(request?.url);
  if (own) origins.add(own);
  return [...origins];
}

export function useSecureCookies(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.PUBLIC_URL ?? "").startsWith("https://");
}
