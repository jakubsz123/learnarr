/** Shapes of the API answers the pages share. */

export interface MediaSummary {
  id: string;
  type: "movie" | "show" | "season" | "episode";
  title: string;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  showTitle?: string;
  showId?: string;
  seasonId?: string;
  hasPoster: boolean;
}

export interface Progress {
  subtitleId: number;
  cards: number;
  coverage: number | null;
}

export interface MediaResponse {
  item: MediaSummary;
  children: MediaSummary[];
  next: MediaSummary | null;
  progress: Record<string, Progress>;
  hasServerSubtitle: boolean;
}

export interface Card {
  id: number;
  term: string;
  form: string;
  translation: string;
  partOfSpeech: string | null;
  note: string | null;
  sentence: string;
  sentenceStartMs: number | null;
  language: string;
  state: "new" | "learning" | "review";
  intervalDays: number;
  due: string;
  suspended: boolean;
  subtitleId: number | null;
}

/** A word the AI picked that the learner hasn't decided on yet. */
export interface Suggestion {
  id: number;
  term: string;
  form: string;
  translation: string;
  partOfSpeech: string | null;
  note: string | null;
  sentence: string;
  language: string;
}

export type Decision = "learn" | "know" | "skip";

export type WordState = "known" | "learning" | null;

export interface VocabEntry {
  word: string;
  forms: string[];
  state: WordState;
  rank: number | null;
  count: number;
}

export interface Transcript {
  lemmatised: boolean;
  vocab: VocabEntry[];
  lines: [start: number, end: number, vocab: number][][];
}

export interface Cue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export type LemmaStatus =
  | { state: "done" | "working" | "unsupported" | "no-engine" }
  | { state: "downloading-model"; percent: number | null }
  | { state: "failed" | "model-failed"; message: string };

export interface SubtitleResponse {
  subtitle: { id: number; language: string; source: string; cueCount: number; wordsPickedAt: string | null };
  cues: Cue[];
  transcript: Transcript;
  coverage: number | null;
  lemmas: LemmaStatus;
  cards: Card[];
  suggestions: Suggestion[];
}

/** One use of a word: which line, and where in it. */
export interface WordUse {
  cue: number;
  start: number;
  end: number;
}

export function episodeLabel(item: { seasonNumber?: number | null; episodeNumber?: number | null }): string {
  return `S${item.seasonNumber ?? "?"} E${item.episodeNumber ?? "?"}`;
}

export function timestamp(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
