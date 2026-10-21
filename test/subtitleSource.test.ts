import { beforeEach, describe, expect, it, vi } from "vitest";
import { addUser, srtWith, testDb } from "./helpers";
import { getSubtitle, type CatalogueDeps } from "../server/utils/subtitleSource";
import { encryptSecret } from "../server/utils/secrets";
import type { MediaDetail, MediaServer, SubtitleTrack } from "../server/utils/media/types";
import type { Db } from "../server/db";

const episode: MediaDetail = {
  id: "ep1",
  type: "episode",
  title: "Pilot",
  showTitle: "Élite",
  seasonNumber: 1,
  episodeNumber: 1,
  showImdbId: "tt7134908",
  hasPoster: true,
  subtitleTracks: [],
};

const track = (id: string, over: Partial<SubtitleTrack> = {}): SubtitleTrack => ({
  id,
  language: "es",
  label: "Spanish",
  codec: "srt",
  forced: false,
  external: true,
  text: true,
  ...over,
});

function fakeServer(item: MediaDetail, texts: Record<string, string | null>): MediaServer {
  return {
    kind: "plex",
    identify: async () => ({ name: "Test", version: "1" }),
    libraries: async () => [],
    items: async () => ({ items: [], total: 0 }),
    children: async () => [],
    item: async () => item,
    poster: async () => new Response(),
    subtitle: async (_item, t) => texts[t.id] ?? null,
  };
}

function fakeCatalogue(
  text: string | null,
): CatalogueDeps & { search: ReturnType<typeof vi.fn>; download: ReturnType<typeof vi.fn> } {
  return {
    search: vi.fn(async () =>
      text === null ? [] : [{ fileId: 9, release: "r", downloads: 1, hearingImpaired: false }],
    ),
    download: vi.fn(async () => text ?? ""),
  };
}

let db: Db;
beforeEach(() => {
  db = testDb();
});

describe("getSubtitle", () => {
  it("uses the media server's track and skips a broken one", async () => {
    const user = addUser(db);
    const server = fakeServer(
      { ...episode, subtitleTracks: [track("broken"), track("good", { external: false })] },
      {
        broken: "not a subtitle",
        good: srtWith(30),
      },
    );
    const catalogue = fakeCatalogue(null);
    const sub = await getSubtitle({ db, server, user, serverItemId: "ep1", catalogue });
    expect(sub).toMatchObject({ source: "plex", language: "es", cueCount: 30 });
    expect(catalogue.search).not.toHaveBeenCalled();
  });

  it("returns the subtitle the user already has without asking again", async () => {
    const user = addUser(db);
    const server = fakeServer({ ...episode, subtitleTracks: [track("good")] }, { good: srtWith(30) });
    const first = await getSubtitle({ db, server, user, serverItemId: "ep1" });
    const subtitle = vi.spyOn(server, "subtitle");
    const second = await getSubtitle({ db, server, user, serverItemId: "ep1" });
    expect(second.id).toBe(first.id);
    expect(subtitle).not.toHaveBeenCalled();
  });

  it("falls back to OpenSubtitles with the user's own account, searching the episode by show id", async () => {
    const user = addUser(db, { opensubtitlesUsername: "me", opensubtitlesPassword: encryptSecret("pw") });
    const catalogue = fakeCatalogue(srtWith(40));
    const sub = await getSubtitle({
      db,
      server: fakeServer(episode, {}),
      user,
      serverItemId: "ep1",
      catalogue,
    });
    expect(sub.source).toBe("opensubtitles");
    expect(catalogue.search).toHaveBeenCalledWith(
      expect.objectContaining({ showImdbId: "tt7134908", season: 1, episode: 1, language: "es" }),
    );
    expect(catalogue.download).toHaveBeenCalledWith(9, user.id, { username: "me", password: "pw" });
  });

  it("asks the user to connect OpenSubtitles when the server has nothing", async () => {
    const user = addUser(db);
    await expect(
      getSubtitle({
        db,
        server: fakeServer(episode, {}),
        user,
        serverItemId: "ep1",
        catalogue: fakeCatalogue(null),
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: expect.stringMatching(/Connect your OpenSubtitles/),
    });
  });

  it("keeps one user's download away from another user", async () => {
    const a = addUser(db, { opensubtitlesUsername: "a", opensubtitlesPassword: encryptSecret("pw") });
    const b = addUser(db);
    await getSubtitle({
      db,
      server: fakeServer(episode, {}),
      user: a,
      serverItemId: "ep1",
      catalogue: fakeCatalogue(srtWith(40)),
    });
    await expect(
      getSubtitle({
        db,
        server: fakeServer(episode, {}),
        user: b,
        serverItemId: "ep1",
        catalogue: fakeCatalogue(null),
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("refuses a show or season", async () => {
    const user = addUser(db);
    await expect(
      getSubtitle({ db, server: fakeServer({ ...episode, type: "show" }, {}), user, serverItemId: "x" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
