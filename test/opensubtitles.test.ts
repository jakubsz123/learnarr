import { describe, expect, it, vi } from "vitest";
import {
  checkApiKey,
  createSessionCache,
  downloadSubtitle,
  openSubtitlesLogin,
  searchSubtitles,
} from "../server/utils/opensubtitles";

const KEY = "test-api-key";

function fakeFetch(handler: (url: string, init?: RequestInit) => Response) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init);
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const file = (id: number, extra: object) => ({
  attributes: { files: [{ file_id: id }], download_count: 10, ...extra },
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("searchSubtitles", () => {
  it("searches an episode by the show's IMDb id, season and episode, with the server's key", async () => {
    const fake = fakeFetch(() => json({ data: [] }));
    await searchSubtitles(
      KEY,
      { language: "es", showImdbId: "tt0475784", season: 1, episode: 2, imdbId: "tt1" },
      fake.fn,
    );
    const url = new URL(fake.calls[0]!.url);
    expect(url.searchParams.get("parent_imdb_id")).toBe("475784");
    expect(url.searchParams.get("season_number")).toBe("1");
    expect(url.searchParams.get("episode_number")).toBe("2");
    expect(url.searchParams.get("imdb_id")).toBeNull();
    expect((fake.calls[0]!.init!.headers as Record<string, string>)["Api-Key"]).toBe(KEY);
  });

  it("drops machine-translated files and puts hearing-impaired ones last", async () => {
    const fake = fakeFetch(() =>
      json({
        data: [
          file(1, { hearing_impaired: true, download_count: 500 }),
          file(2, { ai_translated: true }),
          file(3, { download_count: 50 }),
          file(4, { machine_translated: true }),
        ],
      }),
    );
    const files = await searchSubtitles(KEY, { language: "es", imdbId: "tt5" }, fake.fn);
    expect(files.map((f) => f.fileId)).toEqual([3, 1]);
  });

  it("returns nothing without an id or title rather than searching everything", async () => {
    const fake = fakeFetch(() => json({ data: [] }));
    expect(await searchSubtitles(KEY, { language: "es" }, fake.fn)).toEqual([]);
    expect(fake.calls).toHaveLength(0);
  });

  it("says when OpenSubtitles.com refuses the server's key", async () => {
    const fake = fakeFetch(() => json({}, 403));
    await expect(searchSubtitles(KEY, { language: "es", imdbId: "tt5" }, fake.fn)).rejects.toMatchObject({
      data: { key: "errors.opensubtitles.badApiKey" },
    });
  });
});

describe("checkApiKey", () => {
  it("accepts a key OpenSubtitles.com answers, and refuses one it doesn't, as a typing problem", async () => {
    await expect(checkApiKey(KEY, fakeFetch(() => json({ data: [] })).fn)).resolves.toBeUndefined();
    await expect(checkApiKey(KEY, fakeFetch(() => json({}, 401)).fn)).rejects.toMatchObject({
      statusCode: 400,
      data: { key: "errors.opensubtitles.keyRefused" },
    });
  });
});

describe("login and download", () => {
  it("logs in and uses the host the login names", async () => {
    const fake = fakeFetch(() =>
      json({ token: "t", base_url: "vip-api.opensubtitles.com", user: { allowed_downloads: 20 } }),
    );
    const { session, account } = await openSubtitlesLogin(KEY, "me", "pw", fake.fn);
    expect(session.apiKey).toBe(KEY);
    expect(session.apiBase).toBe("https://vip-api.opensubtitles.com/api/v1");
    expect(account.allowedDownloads).toBe(20);
  });

  it("says when the account details are wrong", async () => {
    const fake = fakeFetch(() => json({}, 401));
    await expect(openSubtitlesLogin(KEY, "me", "bad", fake.fn)).rejects.toThrow(
      /didn't accept that username/,
    );
  });

  it("downloads through the link, and reports an empty daily quota", async () => {
    const session = {
      apiKey: KEY,
      token: "t",
      apiBase: "https://api.example/api/v1",
      expiresAt: Date.now() + 1000,
    };
    const ok = fakeFetch((url) =>
      url.endsWith("/download") ? json({ link: "https://dl.example/f.srt" }) : new Response("SRT"),
    );
    expect(await downloadSubtitle(1, session, ok.fn)).toBe("SRT");
    const sent = ok.calls[0]!.init!.headers as Record<string, string>;
    expect(sent.Authorization).toBe("Bearer t");
    expect(sent["Api-Key"]).toBe(KEY);
    const empty = fakeFetch(() => json({}, 406));
    await expect(downloadSubtitle(1, session, empty.fn)).rejects.toThrow(/no downloads left/);
  });
});

describe("createSessionCache", () => {
  it("reuses a session until it expires, is renewed, or the server's key changes", async () => {
    let now = 0;
    const doLogin = vi.fn(async ({ apiKey }: { apiKey: string }) => ({
      apiKey,
      token: `t${doLogin.mock.calls.length}`,
      apiBase: "x",
      expiresAt: now + 100,
    }));
    const cache = createSessionCache(doLogin, () => now);
    const creds = { apiKey: KEY, username: "u", password: "p" };
    await cache.get("a", creds);
    await cache.get("a", creds);
    expect(doLogin).toHaveBeenCalledTimes(1);
    now = 200;
    await cache.get("a", creds);
    await cache.get("a", creds, true);
    expect(doLogin).toHaveBeenCalledTimes(3);
    await cache.get("a", { ...creds, apiKey: "another-key" });
    expect(doLogin).toHaveBeenCalledTimes(4);
  });
});
