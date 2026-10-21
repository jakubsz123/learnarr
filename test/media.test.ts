import { describe, expect, it } from "vitest";
import { mapPlexDetail, mapPlexSummary } from "../server/utils/media/plex";
import { mapJellyfinDetail, mapJellyfinSummary } from "../server/utils/media/jellyfin";
import { candidateTracks } from "../server/utils/media/tracks";
import type { SubtitleTrack } from "../server/utils/media/types";

describe("Plex mapping", () => {
  it("maps an episode with its subtitle tracks and ids", () => {
    const item = mapPlexDetail({
      ratingKey: 42,
      type: "episode",
      title: "Pilot",
      index: 1,
      parentIndex: 2,
      grandparentTitle: "Élite",
      grandparentRatingKey: 7,
      thumb: "/t",
      Guid: [{ id: "tmdb://1" }, { id: "imdb://tt123" }],
      Media: [
        {
          Part: [
            {
              Stream: [
                { streamType: 1, id: 1 },
                {
                  streamType: 3,
                  id: 10,
                  codec: "srt",
                  languageTag: "es",
                  key: "/library/streams/10",
                  displayTitle: "Spanish (SRT External)",
                },
                { streamType: 3, id: 11, codec: "pgs", languageCode: "spa", displayTitle: "Spanish (PGS)" },
              ],
            },
          ],
        },
      ],
    });
    expect(item).toMatchObject({
      id: "42",
      type: "episode",
      seasonNumber: 2,
      episodeNumber: 1,
      showTitle: "Élite",
      showId: "7",
      imdbId: "tt123",
      hasPoster: true,
    });
    expect(item.subtitleTracks).toEqual([
      {
        id: "10",
        language: "es",
        label: "Spanish (SRT External)",
        codec: "srt",
        forced: false,
        external: true,
        text: true,
      },
      {
        id: "11",
        language: "es",
        label: "Spanish (PGS)",
        codec: "pgs",
        forced: false,
        external: false,
        text: false,
      },
    ]);
    expect(item.streamKeys).toEqual({ "10": "/library/streams/10" });
  });

  it("maps shows and seasons", () => {
    expect(mapPlexSummary({ ratingKey: 1, type: "show", title: "Dark", year: 2017 })).toMatchObject({
      type: "show",
      year: 2017,
      hasPoster: false,
    });
    expect(
      mapPlexSummary({ ratingKey: 2, type: "season", title: "Season 1", index: 1, parentTitle: "Dark" }),
    ).toMatchObject({
      type: "season",
      seasonNumber: 1,
      showTitle: "Dark",
    });
  });
});

describe("Jellyfin mapping", () => {
  it("maps an episode, its media source and text tracks", () => {
    const item = mapJellyfinDetail({
      Id: "abc",
      Type: "Episode",
      Name: "Uno",
      IndexNumber: 3,
      ParentIndexNumber: 1,
      SeriesName: "Narcos",
      SeriesId: "s1",
      ImageTags: { Primary: "x" },
      ProviderIds: { Imdb: "tt9" },
      MediaSources: [{ Id: "src" }],
      MediaStreams: [
        { Type: "Audio", Index: 1 },
        {
          Type: "Subtitle",
          Index: 3,
          Language: "spa",
          Codec: "subrip",
          IsTextSubtitleStream: true,
          IsForced: true,
          DisplayTitle: "Spanish - Forced",
        },
      ],
    });
    expect(item).toMatchObject({
      id: "abc",
      seasonNumber: 1,
      episodeNumber: 3,
      showId: "s1",
      imdbId: "tt9",
      mediaSourceId: "src",
    });
    expect(item.subtitleTracks).toEqual([
      {
        id: "3",
        language: "es",
        label: "Spanish - Forced",
        codec: "subrip",
        forced: true,
        external: false,
        text: true,
      },
    ]);
  });

  it("maps series and movies", () => {
    expect(mapJellyfinSummary({ Id: "1", Type: "Series", Name: "Dark" }).type).toBe("show");
    expect(mapJellyfinSummary({ Id: "2", Type: "Movie", Name: "Roma", ProductionYear: 2018 })).toMatchObject({
      type: "movie",
      year: 2018,
    });
  });
});

const track = (over: Partial<SubtitleTrack>): SubtitleTrack => ({
  id: "1",
  language: "es",
  label: "Spanish",
  codec: "srt",
  forced: false,
  external: false,
  text: true,
  ...over,
});

describe("candidateTracks", () => {
  it("keeps readable, unforced tracks in the language, external and non-SDH first", () => {
    const tracks = [
      track({ id: "embedded" }),
      track({ id: "sdh", external: true, label: "Spanish SDH" }),
      track({ id: "external", external: true }),
      track({ id: "forced", forced: true }),
      track({ id: "pgs", text: false }),
      track({ id: "english", language: "en" }),
    ];
    expect(candidateTracks(tracks, "es").map((t) => t.id)).toEqual(["external", "sdh", "embedded"]);
  });
});
