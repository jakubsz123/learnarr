import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { languageName } from "#shared/languages";
import { DATA_DIR } from "../dataDir";

/**
 * A UDPipe 1 model from the Universal Dependencies 2.5 release
 * (hdl:11234/1-3131), downloaded from LINDAT the first time a language needs it.
 * The sha256 was taken from a real download; a file that doesn't match it is
 * thrown away, so a changed upstream file can never quietly change every lemma.
 */
export interface ModelEntry {
  language: string;
  treebank: string;
  file: string;
  uuid: string;
  sha256: string;
  /** Size in bytes, to show download progress. */
  bytes?: number;
}

/**
 * One model per language. Where UD has several treebanks, the pick is the one
 * with the best lemmas and the most everyday text: German HDT over GSD (curated
 * lemmas), English EWT (web conversation), Portuguese Bosque (both variants).
 */
export const MODELS: readonly ModelEntry[] = [
  {
    language: "cs",
    treebank: "PDT",
    file: "czech-pdt-ud-2.5-191206.udpipe",
    uuid: "124d9958-240e-44e6-b522-eea8447a8de6",
    sha256: "8ced138bf1c2121cf03d2494f08c663a8b27b5218fb9c322064a7d943ba02266",
  },
  {
    language: "es",
    treebank: "AnCora",
    file: "spanish-ancora-ud-2.5-191206.udpipe",
    uuid: "52474ca8-939b-4fcf-80b0-228679464582",
    sha256: "eb7c37977de18072d1f63740c06c588620d48b51dc0c0d0a3604a21db12600fc",
  },
  {
    language: "de",
    treebank: "HDT",
    file: "german-hdt-ud-2.5-191206.udpipe",
    uuid: "0d5a53e7-039b-4997-af3f-94faad001a6c",
    sha256: "881bda50fb1e72f88d5765ad5e670af8ceb203c8bd128a6d783ad8de7b4af43a",
  },
  {
    language: "fr",
    treebank: "GSD",
    file: "french-gsd-ud-2.5-191206.udpipe",
    uuid: "75091a21-f175-4a57-8bbd-8f9a12a7d417",
    sha256: "3b10b4c87e7667ac4cf5b301fa075720303c6a1d101cd11a62abde670bebea30",
  },
  {
    language: "it",
    treebank: "ISDT",
    file: "italian-isdt-ud-2.5-191206.udpipe",
    uuid: "ee10c62a-01c5-42cb-a8b6-b7751c5da12c",
    sha256: "dad54daaa01c250f39ec0ae7d29b3f3830c1eea066db4e3a92c39b41f2dd1a40",
  },
  {
    language: "pt",
    treebank: "Bosque",
    file: "portuguese-bosque-ud-2.5-191206.udpipe",
    uuid: "29d8c3fd-1eb3-479f-93fc-e8982b051aa2",
    sha256: "6d6ff79c2388347426e8dc29c61b759a437ee55789f5925fe21a6df955aac4af",
  },
  {
    language: "pl",
    treebank: "PDB",
    file: "polish-pdb-ud-2.5-191206.udpipe",
    uuid: "3da49192-d502-483b-8592-66eb503b8e60",
    sha256: "ffe6ab0f604f88f82a7d8e8096d94491f99336d0d4c8e2b9700d28190f352e46",
  },
  {
    language: "da",
    treebank: "DDT",
    file: "danish-ddt-ud-2.5-191206.udpipe",
    uuid: "a8049933-959e-4744-a25e-01ec99459867",
    sha256: "fe25149d355609eb551963d70b971fcd3730d35558b758f34d4eb341c6b8569c",
  },
  {
    language: "nl",
    treebank: "Alpino",
    file: "dutch-alpino-ud-2.5-191206.udpipe",
    uuid: "51d5eb7c-b84b-4673-a9a1-3076416bd520",
    sha256: "700198d252054f4625ba03f9ea29881816491077691960a0912f24814ca440d7",
  },
  {
    language: "sv",
    treebank: "Talbanken",
    file: "swedish-talbanken-ud-2.5-191206.udpipe",
    uuid: "4da4b80f-082d-4251-8dc9-c86638bc546b",
    sha256: "116548cf458f4bc47426ab8fa525af704e71886c4acd69a8f84865860a7d2f57",
  },
  {
    language: "en",
    treebank: "EWT",
    file: "english-ewt-ud-2.5-191206.udpipe",
    uuid: "8d51e3d3-1f87-47fe-8975-c197ddf7907b",
    sha256: "784bd0fa85e3d831fd02a55290d0acfd05c953159dc38cc33d52e1b28add9957",
  },
];

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
  const res = await fetchFn(`${LINDAT}/${entry.uuid}/content`, {
    signal: AbortSignal.timeout(20 * 60 * 1000),
  });
  if (!res.ok || !res.body)
    throw new ModelError(`LINDAT answered ${res.status} for the ${entry.language} model.`);

  const total = Number(res.headers.get("content-length")) || entry.bytes || null;
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
      throw new ModelError(
        `The ${entry.language} model from LINDAT doesn't match its checksum, so it wasn't used.`,
      );
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
