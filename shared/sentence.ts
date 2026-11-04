/** A line split around the first use of a word (ignoring case), for showing the word highlighted. */
export function splitAround(sentence: string, word: string | null | undefined) {
  const text = sentence.replace(/\n/g, " ");
  const needle = word?.trim() ?? "";
  const at = needle ? text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase()) : -1;
  if (at === -1) return { before: text, word: "", after: "" };
  return {
    before: text.slice(0, at),
    word: text.slice(at, at + needle.length),
    after: text.slice(at + needle.length),
  };
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The line as HTML with the word in bold, for Anki. */
export function sentenceHtml(sentence: string, word: string | null | undefined): string {
  const { before, word: hit, after } = splitAround(sentence, word);
  return hit ? `${escapeHtml(before)}<b>${escapeHtml(hit)}</b>${escapeHtml(after)}` : escapeHtml(before);
}

/** The fields of a Learnarr note in Anki, in order. AnkiConnect and the export file both use them. */
export const ANKI_FIELDS = ["Term", "Translation", "Sentence", "Note", "Source"] as const;
