export interface Cue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#")) {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Tags and styling a subtitle carries that a reader shouldn't see. */
function cleanText(text: string): string {
  return decodeEntities(
    text
      .replace(/<[^>]+>/g, "")
      .replace(/\{\\[^}]*\}/g, "")
      .replace(/\\N/gi, "\n"),
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/** "01:02:03,456", "01:02:03.456" or "02:03.456" to milliseconds. */
function timeToMs(value: string): number {
  const [clock = "", fraction = "0"] = value.trim().split(/[.,]/);
  const parts = clock.split(":").map(Number);
  while (parts.length < 3) parts.unshift(0);
  const [h = 0, m = 0, s = 0] = parts;
  return ((h * 60 + m) * 60 + s) * 1000 + Number(fraction.padEnd(3, "0").slice(0, 3));
}

const TIMING = /((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})/;

/** SRT and WebVTT share a shape: blocks separated by blank lines, a timing line, then text. */
function parseTimedBlocks(content: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of content.split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const timingAt = lines.findIndex((line) => TIMING.test(line));
    if (timingAt === -1) continue;
    const match = lines[timingAt]!.match(TIMING)!;
    const text = cleanText(lines.slice(timingAt + 1).join("\n"));
    if (!text) continue;
    cues.push({ index: cues.length, startMs: timeToMs(match[1]!), endMs: timeToMs(match[2]!), text });
  }
  return cues;
}

/** ASS/SSA: the [Events] section's Dialogue lines, with Start, End and Text found by the Format line. */
function parseAss(content: string): Cue[] {
  const cues: Cue[] = [];
  let format: string[] | null = null;
  let inEvents = false;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) {
      inEvents = trimmed.toLowerCase() === "[events]";
      continue;
    }
    if (!inEvents) continue;
    if (trimmed.toLowerCase().startsWith("format:")) {
      format = trimmed
        .slice(7)
        .split(",")
        .map((f) => f.trim().toLowerCase());
      continue;
    }
    if (!format || !trimmed.toLowerCase().startsWith("dialogue:")) continue;
    // Text is the last field and may itself contain commas.
    const fields = trimmed.slice(9).split(",");
    const head = fields.slice(0, format.length - 1);
    const text = cleanText(fields.slice(format.length - 1).join(","));
    const start = head[format.indexOf("start")];
    const end = head[format.indexOf("end")];
    if (!text || !start || !end) continue;
    cues.push({ index: 0, startMs: timeToMs(start), endMs: timeToMs(end), text });
  }
  return cues.toSorted((a, b) => a.startMs - b.startMs).map((cue, index) => ({ ...cue, index }));
}

/** Parse SRT, WebVTT or ASS/SSA into cues in time order. An unreadable file gives []. */
export function parseSubtitle(raw: string): Cue[] {
  const content = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (/^\s*\[script info\]/i.test(content) || /^\s*dialogue:/im.test(content)) return parseAss(content);
  return parseTimedBlocks(content);
}

/**
 * Drop what subtitles for the deaf and hard of hearing add in square brackets,
 * like "[sirens]" or "[woman]": it isn't dialogue, so it shouldn't become words
 * to learn. Cues left with nothing to say are removed.
 */
export function withoutSoundDescriptions(cues: Cue[]): Cue[] {
  return cues
    .map((cue) => ({
      ...cue,
      text: cue.text
        .split("\n")
        .map((line) =>
          line
            .replace(/\[[^\]]*\]/g, "")
            .replace(/\s{2,}/g, " ")
            .trim(),
        )
        .filter((line) => line && !/^[-–—:]+$/.test(line))
        .join("\n"),
    }))
    .filter((cue) => cue.text)
    .map((cue, index) => ({ ...cue, index }));
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function msToSrtTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

/** Cues back to SRT, the one format Learnarr stores. */
export function toSrt(cues: Cue[]): string {
  return cues
    .map((cue, i) => `${i + 1}\n${msToSrtTime(cue.startMs)} --> ${msToSrtTime(cue.endMs)}\n${cue.text}\n`)
    .join("\n");
}
