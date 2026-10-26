import { describe, expect, it } from "vitest";
import { parseSubtitle, toSrt, withoutSoundDescriptions } from "../shared/subtitles";

describe("parseSubtitle", () => {
  it("reads SRT, dropping tags and decoding entities", () => {
    const srt =
      "﻿1\r\n00:00:01,500 --> 00:00:03,000\r\n<i>Hola,</i> &amp; adiós\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,250\r\n{\\an8}¿Qué tal?\r\n";
    expect(parseSubtitle(srt)).toEqual([
      { index: 0, startMs: 1500, endMs: 3000, text: "Hola, & adiós" },
      { index: 1, startMs: 4000, endMs: 5250, text: "¿Qué tal?" },
    ]);
  });

  it("keeps multi-line cues and skips empty ones", () => {
    const srt =
      "1\n00:00:01,000 --> 00:00:02,000\n- Sí.\n- No.\n\n2\n00:00:03,000 --> 00:00:04,000\n<i></i>\n";
    const cues = parseSubtitle(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0]!.text).toBe("- Sí.\n- No.");
  });

  it("reads WebVTT, including short timestamps and cue settings", () => {
    const vtt =
      "WEBVTT\n\nNOTE a comment\n\n00:01.000 --> 00:02.500 align:start\nBonjour\n\nid-2\n01:00:00.000 --> 01:00:01.000\n<c.yellow>Salut</c>\n";
    expect(parseSubtitle(vtt)).toEqual([
      { index: 0, startMs: 1000, endMs: 2500, text: "Bonjour" },
      { index: 1, startMs: 3_600_000, endMs: 3_601_000, text: "Salut" },
    ]);
  });

  it("reads ASS dialogue in time order, with commas in the text and \\N line breaks", () => {
    const ass = [
      "[Script Info]",
      "Title: test",
      "",
      "[Events]",
      "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
      "Dialogue: 0,0:00:05.00,0:00:06.00,Default,,0,0,0,,Later line",
      "Dialogue: 0,0:00:01.50,0:00:03.00,Default,,0,0,0,,{\\i1}Ja, das{\\i0} ist\\Ngut",
      "Comment: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,ignored",
    ].join("\n");
    expect(parseSubtitle(ass)).toEqual([
      { index: 0, startMs: 1500, endMs: 3000, text: "Ja, das ist\ngut" },
      { index: 1, startMs: 5000, endMs: 6000, text: "Later line" },
    ]);
  });

  it("gives nothing for a file that isn't subtitles", () => {
    expect(parseSubtitle("<html>not found</html>")).toEqual([]);
    expect(parseSubtitle("")).toEqual([]);
  });

  it("round-trips through SRT", () => {
    const cues = [
      { index: 0, startMs: 61_001, endMs: 3_723_045, text: "Line one\nline two" },
      { index: 1, startMs: 3_724_000, endMs: 3_725_000, text: "Next" },
    ];
    expect(parseSubtitle(toSrt(cues))).toEqual(cues);
  });
});

describe("withoutSoundDescriptions", () => {
  it("drops bracketed descriptions and the cues left empty", () => {
    const cue = (index: number, text: string) => ({
      index,
      startMs: index * 1000,
      endMs: index * 1000 + 500,
      text,
    });
    const cues = [
      cue(0, "[sirenas de ambulancia]"),
      cue(1, "[mujer] Samuel."),
      cue(2, "- [ríe]\n- ¿Qué pasa?"),
    ];
    expect(withoutSoundDescriptions(cues)).toEqual([
      { ...cue(1, "Samuel."), index: 0 },
      { ...cue(2, "- ¿Qué pasa?"), index: 1 },
    ]);
  });
});
