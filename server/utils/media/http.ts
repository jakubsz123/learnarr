import { MediaServerError } from "./types";

const TIMEOUT_MS = 15_000;

/** One request to a media server, with the error a person can act on. */
export async function mediaFetch(
  url: string,
  init: RequestInit & { label: string },
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(url, { ...init, signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const timedOut = (error as Error).name === "TimeoutError";
    throw new MediaServerError(timedOut ? "errors.media.timeout" : "errors.media.unreachable", {
      server: init.label,
    });
  }
  if (response.status === 401 || response.status === 403) {
    throw new MediaServerError("errors.media.rejected", { server: init.label });
  }
  if (response.status === 404) throw new MediaServerError("errors.media.noItem", { server: init.label }, 404);
  if (!response.ok) {
    throw new MediaServerError("errors.media.httpError", { server: init.label, status: response.status });
  }
  return response;
}

export async function mediaJson<T>(
  url: string,
  init: RequestInit & { label: string },
  fetchImpl?: typeof fetch,
) {
  const response = await mediaFetch(
    url,
    { ...init, headers: { Accept: "application/json", ...init.headers } },
    fetchImpl,
  );
  return (await response.json()) as T;
}

/** Text from a URL, or null on any failure: callers try the next way of getting a subtitle. */
export async function mediaText(url: string, headers: HeadersInit, fetchImpl: typeof fetch = fetch) {
  try {
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}
