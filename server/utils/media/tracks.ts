import type { SubtitleTrack } from "./types";

/**
 * The tracks worth trying for a language, best first. Forced tracks only carry
 * the odd foreign line, and picture-based tracks can't be read, so both are out.
 * External files beat embedded ones: Plex serves them directly. Full subtitles
 * beat SDH ones, whose [door creaks] lines would end up as cards.
 */
const isSdh = (t: SubtitleTrack) => /\b(sdh|cc|hearing)\b/i.test(t.label);

export function candidateTracks(tracks: SubtitleTrack[], language: string): SubtitleTrack[] {
  return tracks
    .filter((t) => t.language === language && t.text && !t.forced)
    .toSorted((a, b) => Number(b.external) - Number(a.external) || Number(isSdh(a)) - Number(isSdh(b)));
}
