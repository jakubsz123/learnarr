import { describe, expect, it } from "vitest";
import { isCatalogueId } from "../shared/mediaSources";
import { createCatalogue, parseCatalogueId } from "../server/utils/media/catalogue";
import { nextEpisode, previousEpisode } from "../server/utils/media/types";

const elite = {
  feature_id: "658716",
  feature_type: "Tvshow",
  title: "elite",
  original_title: "Élite",
  year: "2018",
  imdb_id: 7134908,
  img_url: "https://img.example/658716.jpg",
  subtitles_count: 900,
  seasons: [
    {
      season_number: 1,
      episodes: [
        { episode_number: 1, title: "Welcome", feature_imdb_id: 7671662 },
        { episode_number: 2, title: "Desire", feature_imdb_id: 7712166 },
      ],
    },
    { season_number: 2, episodes: [{ episode_number: 1, title: "Samuel", feature_imdb_id: 8000001 }] },
  ],
};
const loose = {
  feature_id: "1",
  title: "elite short stories",
  original_title: "Élite Short Stories",
  subtitles_count: 5000,
};
const film = {
  feature_id: "9",
  feature_type: "Movie",
  title: "roma",
  original_title: "Roma",
  imdb_id: 6155172,
  subtitles_count: 80,
};

/** A stand-in for the catalogue API: searches by type, and looks features up by id. */
function fakeApi(): typeof fetch {
  return (async (input: string | URL) => {
    const params = new URL(String(input)).searchParams;
    const byId: Record<string, object> = { "658716": elite, "9": film };
    const found = params.get("feature_id")
      ? [byId[params.get("feature_id")!]].filter(Boolean)
      : params.get("type") === "tvshow"
        ? [loose, elite]
        : [film];
    return Response.json({ data: found.map((attributes) => ({ attributes })) });
  }) as typeof fetch;
}

describe("catalogue ids", () => {
  it("reads films, shows, seasons and episodes, and tells them from media server ids", () => {
    expect(parseCatalogueId("os-m-9")).toEqual({ kind: "movie", feature: "9" });
    expect(parseCatalogueId("os-s-658716-2-1")).toEqual({
      kind: "episode",
      feature: "658716",
      season: 2,
      episode: 1,
    });
    expect(parseCatalogueId("os-m-9-1")).toBeNull();
    expect(parseCatalogueId("12345")).toBeNull();
    expect(isCatalogueId("os")).toBe(true);
    expect(isCatalogueId("12345")).toBe(false);
  });
});

describe("OpenSubtitles.com catalogue", () => {
  it("answers searches only, with an exact title first, accents or not", async () => {
    const catalogue = createCatalogue(fakeApi());
    expect(await catalogue.items("os", { start: 0, limit: 10 })).toEqual({ items: [], total: 0 });
    const { items } = await catalogue.items("os", { start: 0, limit: 10, search: "elite" });
    expect(items.map((i) => i.title)).toEqual(["Élite", "Élite Short Stories", "Roma"]);
    expect(items[0]).toMatchObject({ id: "os-s-658716", type: "show", year: 2018, hasPoster: true });
    expect(items[1]).toMatchObject({ id: "os-s-1", type: "show", hasPoster: false });
  });

  it("walks a show's seasons and episodes, with the ids subtitles are found by", async () => {
    const catalogue = createCatalogue(fakeApi());
    const seasons = await catalogue.children("os-s-658716");
    expect(seasons.map((s) => s.id)).toEqual(["os-s-658716-1", "os-s-658716-2"]);
    const episode = await catalogue.item("os-s-658716-1-2");
    expect(episode).toMatchObject({
      type: "episode",
      title: "Desire",
      showTitle: "Élite",
      showId: "os-s-658716",
      seasonId: "os-s-658716-1",
      seasonNumber: 1,
      episodeNumber: 2,
      imdbId: "tt7712166",
      showImdbId: "tt7134908",
      subtitleTracks: [],
    });
    expect((await nextEpisode(catalogue, episode))?.id).toBe("os-s-658716-2-1");
    expect((await previousEpisode(catalogue, episode))?.id).toBe("os-s-658716-1-1");
    await expect(catalogue.item("os-s-658716-1-9")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("finds a film by its id", async () => {
    const catalogue = createCatalogue(fakeApi());
    expect(await catalogue.item("os-m-9")).toMatchObject({
      type: "movie",
      title: "Roma",
      imdbId: "tt6155172",
    });
  });
});
