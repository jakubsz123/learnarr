import type { Cue } from "#shared/subtitles";
import { isCounted, isWordText, splitWords, wordKey } from "#shared/words";
import type { LemmaToken } from "../db/schema";
import { wordRank } from "./frequency";
import type { WordState } from "./knownWords";

/** One distinct word of a subtitle, by its dictionary form when there is one. */
export interface VocabEntry {
  /** The dictionary form, or the form used when there's no lemmatiser for the language. */
  word: string;
  /** How it appears in the subtitle, first use first. */
  forms: string[];
  state: WordState | null;
  rank: number | null;
  /** Uses that count towards "% you know" (not names, numbers or punctuation). */
  count: number;
}

/** A cue's words as `[start, end, vocabIndex]`, offsets into the cue's text. */
export type LineWords = [start: number, end: number, vocab: number][];

export interface Transcript {
  lemmatised: boolean;
  vocab: VocabEntry[];
  lines: LineWords[];
}

/**
 * Index a subtitle's words: what each one is, how well the learner knows it
 * and how common it is. Without lemmas the words are split on spaces and
 * stand for themselves.
 */
export function buildTranscript(
  cues: Cue[],
  tokens: LemmaToken[] | null,
  states: Map<string, WordState>,
  ranks: Map<string, number> | null,
): Transcript {
  const vocab: VocabEntry[] = [];
  const index = new Map<string, number>();
  const lines: LineWords[] = cues.map(() => []);

  const add = (cue: number, start: number, end: number, lemma: string | null, upos: string) => {
    const surface = cues[cue]?.text.slice(start, end) ?? "";
    if (!isWordText(surface)) return;
    const word = lemma && isWordText(lemma) ? wordKey(lemma) : wordKey(surface);
    let i = index.get(word);
    if (i === undefined) {
      i = vocab.push({ word, forms: [], state: states.get(word) ?? null, rank: null, count: 0 }) - 1;
      index.set(word, i);
    }
    const entry = vocab[i]!;
    const form = wordKey(surface);
    if (!entry.forms.includes(form)) {
      entry.forms.push(form);
      entry.state ??= states.get(form) ?? null;
    }
    if (isCounted({ upos })) entry.count++;
    lines[cue]?.push([start, end, i]);
  };

  if (tokens) {
    for (const [cue, start, end, lemma, upos] of tokens) add(cue, start, end, lemma, upos);
  } else {
    cues.forEach((cue, i) => {
      for (const t of splitWords(cue.text)) add(i, t.start, t.end, null, t.upos);
    });
  }
  for (const entry of vocab) entry.rank = wordRank(ranks, entry.word, ...entry.forms);
  return { lemmatised: tokens !== null, vocab, lines };
}

/** Share of the counted uses of words that the learner knows, 0–1; null without lemmas. */
export function transcriptCoverage(transcript: Transcript): number | null {
  if (!transcript.lemmatised) return null;
  let total = 0;
  let known = 0;
  for (const entry of transcript.vocab) {
    total += entry.count;
    if (entry.state === "known") known += entry.count;
  }
  return total ? known / total : null;
}
