/**
 * An address from plex.tv as a person would write it. Plex gives local servers
 * a name like "192-168-1-20.<hash>.plex.direct"; the part that matters is the IP.
 */
export function readableAddress(uri: string): string {
  try {
    const { hostname, port } = new URL(uri);
    const direct = /^(\d{1,3}(?:-\d{1,3}){3})\.[0-9a-f]+\.plex\.direct$/i.exec(hostname);
    const host = direct ? direct[1]!.replaceAll("-", ".") : hostname;
    return port ? `${host}:${port}` : host;
  } catch {
    return uri;
  }
}
