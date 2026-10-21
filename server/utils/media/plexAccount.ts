import { mediaJson } from "./http";
import { PLEX_CLIENT_ID, PLEX_PRODUCT } from "./plex";

/**
 * "Sign in with Plex": plex.tv's PIN flow gives an account token without the
 * person ever pasting one, and the account's resources list says which servers
 * it can reach and at which addresses.
 */

const PLEX_TV = "https://plex.tv/api/v2";
const headers = { "X-Plex-Client-Identifier": PLEX_CLIENT_ID, "X-Plex-Product": PLEX_PRODUCT };

export interface PlexPin {
  id: number;
  code: string;
  authUrl: string;
}

export async function createPlexPin(fetchImpl: typeof fetch = fetch): Promise<PlexPin> {
  const pin = await mediaJson<{ id: number; code: string }>(
    `${PLEX_TV}/pins?strong=true`,
    { method: "POST", headers, label: "plex.tv" },
    fetchImpl,
  );
  const params = new URLSearchParams({
    clientID: PLEX_CLIENT_ID,
    code: pin.code,
    "context[device][product]": PLEX_PRODUCT,
  });
  return { id: pin.id, code: pin.code, authUrl: `https://app.plex.tv/auth#?${params}` };
}

/** The account token once the person has approved the PIN, else null. */
export async function checkPlexPin(id: number, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const pin = await mediaJson<{ authToken: string | null }>(
    `${PLEX_TV}/pins/${id}`,
    { headers, label: "plex.tv" },
    fetchImpl,
  );
  return pin.authToken || null;
}

export interface PlexServerChoice {
  name: string;
  owned: boolean;
  /** Best first: local network, then direct remote, then Plex's relay. */
  connections: { uri: string; local: boolean; relay: boolean }[];
  /** The server's own access token; for a shared server it differs from the account's. */
  token: string;
}

export async function listPlexServers(
  accountToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PlexServerChoice[]> {
  const resources = await mediaJson<Record<string, any>[]>(
    `${PLEX_TV}/resources?includeHttps=1&includeRelay=1`,
    { headers: { ...headers, "X-Plex-Token": accountToken }, label: "plex.tv" },
    fetchImpl,
  );
  const rank = (c: { local: boolean; relay: boolean }) => (c.local ? 0 : c.relay ? 2 : 1);
  return resources
    .filter((r) =>
      String(r.provides ?? "")
        .split(",")
        .includes("server"),
    )
    .map((r) => ({
      name: String(r.name ?? "Plex"),
      owned: Boolean(r.owned),
      token: String(r.accessToken ?? accountToken),
      connections: (r.connections ?? [])
        .filter((c: any) => typeof c?.uri === "string")
        .map((c: any) => ({ uri: String(c.uri), local: Boolean(c.local), relay: Boolean(c.relay) }))
        .toSorted(
          (a: { local: boolean; relay: boolean }, b: { local: boolean; relay: boolean }) => rank(a) - rank(b),
        ),
    }))
    .filter((r) => r.connections.length > 0);
}
