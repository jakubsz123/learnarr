import { execFile } from "node:child_process";
import type { LemmaToken } from "../../db/schema";

/** A word as UDPipe reports it, with offsets in code points over the whole input. */
export interface EngineToken {
  form: string;
  lemma: string | null;
  upos: string;
  start: number;
  end: number;
}

const RANGE = /(?:^|\|)TokenRange=(\d+):(\d+)(?:\||$)/;

/**
 * Read UDPipe's CoNLL-U output (run with `--tokenizer=ranges`). A contraction
 * such as Spanish "del" is one range line followed by its words ("de", "el");
 * those words carry the lemmas and share the contraction's offsets.
 */
export function parseConllu(conllu: string): EngineToken[] {
  const tokens: EngineToken[] = [];
  let span: { last: number; start: number; end: number } | null = null;

  for (const line of conllu.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [id, form, lemma, upos, , , , , , misc] = line.split("\t");
    if (!id || form === undefined || lemma === undefined || !upos || misc === undefined) continue;
    if (id.includes(".")) continue; // an empty node, not a word in the text
    const range = RANGE.exec(misc);

    if (id.includes("-")) {
      const last = Number(id.split("-")[1]);
      if (!range || !Number.isInteger(last)) throw new Error(`UDPipe gave an unreadable line: ${line}`);
      span = { last, start: Number(range[1]), end: Number(range[2]) };
      continue;
    }

    let start: number;
    let end: number;
    if (span) {
      ({ start, end } = span);
      if (Number(id) >= span.last) span = null;
    } else if (range) {
      start = Number(range[1]);
      end = Number(range[2]);
    } else {
      throw new Error(`UDPipe gave a word without its position: ${line}`);
    }
    tokens.push({ form, lemma: lemma === "_" || lemma === "" ? null : lemma, upos, start, end });
  }
  return tokens;
}

/** Cues are fed to UDPipe as paragraphs, so a sentence never runs across two of them. */
export const CUE_SEPARATOR = "\n\n";

/**
 * Turn whole-document code point offsets into (cue, start, end) with offsets
 * in UTF-16 units into the cue's own text, which is what the browser slices by.
 */
export function alignToCues(tokens: EngineToken[], cueTexts: string[]): LemmaToken[] {
  const starts: number[] = [];
  const unitMaps: number[][] = [];
  let offset = 0;
  for (const text of cueTexts) {
    starts.push(offset);
    const map = [0];
    for (const ch of text) map.push(map.at(-1)! + ch.length);
    unitMaps.push(map);
    offset += map.length - 1 + CUE_SEPARATOR.length;
  }

  const aligned: LemmaToken[] = [];
  let cue = 0;
  for (const token of tokens) {
    while (cue < cueTexts.length - 1 && token.start >= starts[cue + 1]!) cue++;
    const map = unitMaps[cue]!;
    const clamp = (n: number) => Math.min(Math.max(n - starts[cue]!, 0), map.length - 1);
    aligned.push([cue, map[clamp(token.start)]!, map[clamp(token.end)]!, token.lemma, token.upos]);
  }
  return aligned;
}

export type Lemmatizer = (cueTexts: string[], modelPath: string) => Promise<LemmaToken[]>;

// A whole film takes UDPipe a few seconds; two minutes means it is stuck.
const TIMEOUT_MS = 2 * 60 * 1000;

/** Run the UDPipe binary over a subtitle's lines. */
export function udpipe(binary: string): Lemmatizer {
  return (cueTexts, modelPath) =>
    new Promise((resolve, reject) => {
      const child = execFile(
        binary,
        ["--tokenize", "--tokenizer=ranges", "--tag", modelPath],
        { timeout: TIMEOUT_MS, killSignal: "SIGKILL", maxBuffer: 256 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`UDPipe failed: ${(stderr || error.message).trim().split("\n")[0]}`));
            return;
          }
          try {
            resolve(alignToCues(parseConllu(stdout), cueTexts));
          } catch (parseError) {
            reject(parseError);
          }
        },
      );
      // The callback above reports a process that died before reading its input.
      child.stdin?.on("error", () => {});
      child.stdin?.end(cueTexts.join(CUE_SEPARATOR), "utf8");
    });
}
