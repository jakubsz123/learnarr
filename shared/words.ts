/** How a word is stored and compared: lowercased, composed. */
export const wordKey = (word: string) => word.normalize("NFC").toLocaleLowerCase();

/** A word in a subtitle line: where it sits in the line's text, and its dictionary form when known. */
export interface Token {
  start: number;
  end: number;
  lemma: string | null;
  /** Universal part-of-speech tag from UDPipe, or "" for the plain split. */
  upos: string;
}

const WORD = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

/** Split a line into words without a lemmatiser: runs of letters, keeping inner apostrophes and hyphens. */
export function splitWords(text: string): Token[] {
  return [...text.matchAll(WORD)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    lemma: null,
    upos: "",
  }));
}

/** Tags that aren't words to know: punctuation, symbols, numbers, names and unknown bits. */
const NOT_COUNTED = new Set(["PUNCT", "SYM", "NUM", "PROPN", "X"]);

export const isCounted = (token: Pick<Token, "upos">) => !NOT_COUNTED.has(token.upos);

/** A token is a word if it has a letter in it; punctuation stays plain text in the transcript. */
export const isWordText = (text: string) => /\p{L}/u.test(text);
