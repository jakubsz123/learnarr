import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { addUser, srtWith, testDb } from "./helpers";
import { schema, type Db } from "../server/db";
import { alignToCues, CUE_SEPARATOR, parseConllu, udpipe } from "../server/utils/lemmas/engine";
import { createLemmas } from "../server/utils/lemmas";
import { downloadModel, modelEntry, ModelError, type ModelEntry } from "../server/utils/lemmas/models";

const row = (id: string, form: string, lemma: string, upos: string, misc: string) =>
  [id, form, lemma, upos, "_", "_", "_", "_", "_", misc].join("\t");

describe("reading UDPipe's output", () => {
  const conllu = [
    "# newdoc",
    "# sent_id = 1",
    row("1", "Vengo", "venir", "VERB", "TokenRange=0:5"),
    row("2-3", "del", "_", "_", "TokenRange=6:9"),
    row("2", "de", "de", "ADP", "_"),
    row("3", "el", "el", "DET", "_"),
    row("4", "mercado", "mercado", "NOUN", "SpaceAfter=No|TokenRange=10:17"),
    row("5", "😀", "_", "SYM", "TokenRange=18:19"),
    "",
    row("1", "Sí", "sí", "INTJ", "TokenRange=21:23"),
    "",
  ].join("\n");

  it("gives every word its lemma and position, splitting contractions", () => {
    expect(parseConllu(conllu).map((t) => [t.form, t.lemma, t.start, t.end])).toEqual([
      ["Vengo", "venir", 0, 5],
      ["de", "de", 6, 9],
      ["el", "el", 6, 9],
      ["mercado", "mercado", 10, 17],
      ["😀", null, 18, 19],
      ["Sí", "sí", 21, 23],
    ]);
  });

  it("maps positions back onto each line, in UTF-16 units", () => {
    const lines = ["Vengo del mercado 😀", "Sí"];
    expect(lines.join(CUE_SEPARATOR).length).toBe(24); // the emoji is two units, one code point
    const aligned = alignToCues(parseConllu(conllu), lines);
    expect(aligned.at(-2)).toEqual([0, 18, 20, null, "SYM"]);
    expect(aligned.at(-1)).toEqual([1, 0, 2, "sí", "INTJ"]);
    expect(lines[0]!.slice(aligned[3]![1], aligned[3]![2])).toBe("mercado");
  });

  it("refuses output without positions rather than guessing them", () => {
    expect(() => parseConllu(row("1", "Hola", "hola", "INTJ", "_"))).toThrow(/position/);
  });
});

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "learnarr-models-"));
}

const bodyOf = (bytes: Buffer) =>
  (async () =>
    new Response(new Uint8Array(bytes), {
      headers: { "content-length": String(bytes.length) },
    })) as unknown as typeof fetch;

describe("downloading models", () => {
  const bytes = Buffer.from("a model");
  const entry: ModelEntry = {
    language: "xx",
    treebank: "T",
    file: "xx.udpipe",
    uuid: "u",
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };

  it("puts the file in place when its checksum matches", async () => {
    const dir = tempDir();
    const seen: number[] = [];
    const file = await downloadModel(entry, dir, bodyOf(bytes), (n) => seen.push(n));
    expect(fs.readFileSync(file, "utf8")).toBe("a model");
    expect(seen.at(-1)).toBe(bytes.length);
  });

  it("throws the file away when it doesn't", async () => {
    const dir = tempDir();
    await expect(downloadModel(entry, dir, bodyOf(Buffer.from("tampered")))).rejects.toThrow(ModelError);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe("lemmatising subtitles", () => {
  let db: Db;
  let dir: string;
  let calls: number;
  const lemmatizer = async (lines: string[]) => {
    calls++;
    return lines.map(
      (line, i) => [i, 0, line.indexOf(" "), "línea", "NOUN"] as [number, number, number, string, string],
    );
  };

  function subtitle(language: string) {
    const user = addUser(db);
    const item = db
      .insert(schema.mediaItems)
      .values({ server: "plex", serverItemId: String(Math.random()), kind: "movie", title: "Roma" })
      .returning()
      .get();
    return db
      .insert(schema.subtitles)
      .values({
        userId: user.id,
        mediaItemId: item.id,
        language,
        source: "plex",
        content: srtWith(3),
        cueCount: 3,
      })
      .returning()
      .get();
  }

  beforeEach(() => {
    db = testDb();
    dir = tempDir();
    calls = 0;
  });

  it("stores tokens for a language whose model is installed", async () => {
    fs.writeFileSync(path.join(dir, modelEntry("es")!.file), "");
    const lemmas = createLemmas({ db, lemmatizer: () => lemmatizer, modelDir: dir });
    const sub = subtitle("es");
    expect(lemmas.status(sub)).toEqual({ state: "working" });
    await lemmas.idle();
    expect(lemmas.status(sub)).toEqual({ state: "done" });
    const stored = db.select().from(schema.subtitleLemmas).get();
    expect(stored?.tokens?.[0]).toEqual([0, 0, 5, "línea", "NOUN"]);
    lemmas.queue(sub.id);
    await lemmas.idle();
    expect(calls).toBe(1);
  });

  it("reports a failed model download for the language, and tries again on request", async () => {
    const lemmas = createLemmas({
      db,
      lemmatizer: () => lemmatizer,
      modelDir: dir,
      fetchFn: bodyOf(Buffer.from("not the model")),
    });
    const sub = subtitle("es");
    lemmas.queue(sub.id);
    await lemmas.idle();
    expect(lemmas.status(sub)).toMatchObject({ state: "model-failed" });
    expect(lemmas.modelStatus("es")).toMatchObject({ state: "failed" });
    fs.writeFileSync(path.join(dir, modelEntry("es")!.file), "");
    lemmas.retry(sub);
    await lemmas.idle();
    expect(lemmas.status(sub)).toEqual({ state: "done" });
  });

  it("leaves languages without a model, and setups without UDPipe, alone", async () => {
    const lemmas = createLemmas({ db, lemmatizer: () => lemmatizer, modelDir: dir });
    expect(lemmas.status(subtitle("ja"))).toEqual({ state: "unsupported" });
    const none = createLemmas({ db, lemmatizer: () => null, modelDir: dir });
    expect(none.status(subtitle("es"))).toEqual({ state: "no-engine" });
    await lemmas.idle();
    expect(calls).toBe(0);
  });

  it("records a failure from the engine", async () => {
    fs.writeFileSync(path.join(dir, modelEntry("es")!.file), "");
    const lemmas = createLemmas({
      db,
      lemmatizer: () => async () => {
        throw new Error("UDPipe failed: boom");
      },
      modelDir: dir,
    });
    const sub = subtitle("es");
    lemmas.queue(sub.id);
    await lemmas.idle();
    expect(lemmas.status(sub)).toEqual({ state: "failed", message: "UDPipe failed: boom" });
  });
});

// The real binary, when it's installed (CI runs scripts/fetch-udpipe.sh), on a
// toy model trained here from a few sentences: enough to check the command
// line and the output it gives, without downloading a real model.
const BIN = path.resolve("data/udpipe/udpipe");

function toyTrainingData(): string {
  const sentences = [
    ["Los/el/DET", "gatos/gato/NOUN", "comen/comer/VERB", "./././PUNCT"],
    ["Vengo/venir/VERB", "del", "de/de/ADP", "el/el/DET", "mercado/mercado/NOUN", "./././PUNCT"],
    ["El/el/DET", "perro/perro/NOUN", "come/comer/VERB", "./././PUNCT"],
  ];
  const blocks: string[] = [];
  for (let n = 0; n < 30; n++) {
    for (const words of sentences) {
      const rows: string[] = [];
      let id = 1;
      words.forEach((w, i) => {
        if (w === "del") {
          rows.push(`${id}-${id + 1}\tdel\t_\t_\t_\t_\t_\t_\t_\t_`);
          return;
        }
        const [form, lemma, upos] = w.startsWith("./") ? [".", ".", "PUNCT"] : w.split("/");
        const spaceAfter = words[i + 1]?.startsWith("./") ? "SpaceAfter=No" : "_";
        rows.push(
          [
            id,
            form,
            lemma,
            upos,
            "_",
            "_",
            id === 1 ? 0 : 1,
            id === 1 ? "root" : "dep",
            "_",
            spaceAfter,
          ].join("\t"),
        );
        id++;
      });
      blocks.push(`${rows.join("\n")}\n`);
    }
  }
  return blocks.join("\n");
}

describe.skipIf(!fs.existsSync(BIN))("the UDPipe binary", () => {
  it("lemmatises lines and lines the words back up with them", { timeout: 60_000 }, async () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, "train.conllu"), toyTrainingData());
    execFileSync(
      BIN,
      [
        "--train",
        path.join(dir, "toy.udpipe"),
        "--parser=none",
        "--tokenizer=epochs=2",
        "--tagger=iterations=2",
        path.join(dir, "train.conllu"),
      ],
      { stdio: "ignore" },
    );

    const lines = ["Los gatos comen.", "Vengo del mercado 😀"];
    const tokens = await udpipe(BIN)(lines, path.join(dir, "toy.udpipe"));
    const words = tokens.map(([cue, start, end, lemma]) => [lines[cue]!.slice(start, end), lemma]);
    expect(words).toEqual([
      ["Los", "el"],
      ["gatos", "gato"],
      ["comen", "comer"],
      [".", "."],
      ["Vengo", "venir"],
      ["del", "de"],
      ["del", "el"],
      ["mercado", "mercado"],
      ["😀", expect.anything()],
    ]);
  });
});
