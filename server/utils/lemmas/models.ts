import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { languageName } from "#shared/languages";
import { DATA_DIR } from "../dataDir";
import pins from "./udpipe-models.json";

/**
 * A UDPipe 1 model from the Universal Dependencies 2.5 release
 * (hdl:11234/1-3131), downloaded from LINDAT the first time a language needs it.
 * The pins (bitstream id, sha256, size) live in udpipe-models.json, written by
 * scripts/pin-udpipe-models.mjs from real downloads checked against LINDAT's
 * MD5s; a file that doesn't match its sha256 is thrown away, so a changed
 * upstream file can never quietly change every lemma.
 */
export interface ModelEntry {
  language: string;
  file: string;
  uuid: string;
  sha256: string;
  bytes: number;
}

/**
 * The treebank each language's model was trained on. Where UD has several, the
 * pick favours good lemmas and everyday text: German HDT over GSD (curated
 * lemmas), English EWT (web conversation), Portuguese Bosque (both variants),
 * Chinese GSDSimp (simplified characters, as most subtitles are), Russian
 * SynTagRus (the largest). Korean is left out: its treebanks' lemmas are
 * morpheme chains ("먹+었+다"), which don't group a word's forms.
 */
const TREEBANKS: Record<string, string> = {
  af: "afrikaans-afribooms",
  ar: "arabic-padt",
  be: "belarusian-hse",
  bg: "bulgarian-btb",
  ca: "catalan-ancora",
  cs: "czech-pdt",
  da: "danish-ddt",
  de: "german-hdt",
  el: "greek-gdt",
  en: "english-ewt",
  es: "spanish-ancora",
  et: "estonian-edt",
  eu: "basque-bdt",
  fa: "persian-seraji",
  fi: "finnish-tdt",
  fr: "french-gsd",
  ga: "irish-idt",
  gd: "scottish_gaelic-arcosg",
  gl: "galician-ctg",
  he: "hebrew-htb",
  hi: "hindi-hdtb",
  hr: "croatian-set",
  hu: "hungarian-szeged",
  hy: "armenian-armtdp",
  id: "indonesian-gsd",
  it: "italian-isdt",
  ja: "japanese-gsd",
  lt: "lithuanian-alksnis",
  lv: "latvian-lvtb",
  mr: "marathi-ufal",
  mt: "maltese-mudt",
  nl: "dutch-alpino",
  nn: "norwegian-nynorsk",
  no: "norwegian-bokmaal",
  pl: "polish-pdb",
  pt: "portuguese-bosque",
  ro: "romanian-rrt",
  ru: "russian-syntagrus",
  se: "north_sami-giella",
  sk: "slovak-snk",
  sl: "slovenian-ssj",
  sr: "serbian-set",
  sv: "swedish-talbanken",
  ta: "tamil-ttb",
  te: "telugu-mtg",
  tr: "turkish-imst",
  ug: "uyghur-udt",
  uk: "ukrainian-iu",
  ur: "urdu-udtb",
  vi: "vietnamese-vtb",
  wo: "wolof-wtb",
  zh: "chinese-gsdsimp",
};

const PINS = new Map((pins as Omit<ModelEntry, "language">[]).map((pin) => [pin.file, pin]));

export const MODELS: readonly ModelEntry[] = Object.entries(TREEBANKS).map(([language, treebank]) => {
  const pin = PINS.get(`${treebank}-ud-2.5-191206.udpipe`);
  if (!pin) throw new Error(`udpipe-models.json has no pin for the ${language} model (${treebank}).`);
  return { language, ...pin };
});

export const LINDAT = "https://lindat.mff.cuni.cz/repository/server/api/core/bitstreams";

export const modelEntry = (language: string) => MODELS.find((m) => m.language === language);

/** The UDPipe binary: the image puts it in /opt/udpipe, `scripts/fetch-udpipe.sh` in the data folder. */
export const UDPIPE_BIN = process.env.UDPIPE_BIN || path.join(DATA_DIR, "udpipe", "udpipe");
export const MODEL_DIR = path.join(DATA_DIR, "udpipe", "models");

export class ModelError extends Error {
  override name = "ModelError";
}

/**
 * Download a model into `dir`, checking it against its pinned sha256 before it
 * is put in place. Returns the model's path.
 */
export async function downloadModel(
  entry: ModelEntry,
  dir: string,
  fetchFn: typeof fetch = fetch,
  onProgress?: (bytes: number, total: number | null) => void,
): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, entry.file);
  const partial = `${target}.part`;
  const name = languageName(entry.language);
  const res = await fetchFn(`${LINDAT}/${entry.uuid}/content`, {
    signal: AbortSignal.timeout(20 * 60 * 1000),
  }).catch((error: Error) => {
    const cause = (error.cause as Error | undefined)?.message ?? error.message;
    throw new ModelError(`Couldn't reach lindat.mff.cuni.cz to download the ${name} model (${cause}).`);
  });
  if (!res.ok || !res.body) {
    throw new ModelError(`lindat.mff.cuni.cz answered ${res.status} for the ${name} model.`);
  }

  const total = Number(res.headers.get("content-length")) || entry.bytes;
  const hash = crypto.createHash("sha256");
  let bytes = 0;
  const count = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      hash.update(chunk);
      bytes += chunk.length;
      onProgress?.(bytes, total);
      done(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(res.body as never), count, fs.createWriteStream(partial));
    const sha256 = hash.digest("hex");
    if (sha256 !== entry.sha256) {
      throw new ModelError(`The ${name} model from LINDAT doesn't match its checksum, so it wasn't used.`);
    }
    fs.renameSync(partial, target);
    return target;
  } finally {
    fs.rmSync(partial, { force: true });
  }
}

export function installedModel(language: string, dir = MODEL_DIR): string | null {
  const entry = modelEntry(language);
  if (!entry) return null;
  const file = path.join(dir, entry.file);
  return fs.existsSync(file) ? file : null;
}
