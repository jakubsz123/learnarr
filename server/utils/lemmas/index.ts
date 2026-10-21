import fs from "node:fs";
import { and, eq, isNull } from "drizzle-orm";
import { parseSubtitle } from "#shared/subtitles";
import { schema, useDb, type Db } from "../../db";
import { udpipe, type Lemmatizer } from "./engine";
import { downloadModel, installedModel, MODEL_DIR, modelEntry, UDPIPE_BIN } from "./models";

export type LemmaStatus =
  | { state: "done" }
  | { state: "working" }
  | { state: "downloading-model"; percent: number | null }
  | { state: "failed"; message: string }
  | { state: "model-failed"; message: string }
  /** No model for the language: words are split on spaces and there is no "% you know". */
  | { state: "unsupported" }
  /** The UDPipe binary isn't installed (a dev setup without `scripts/fetch-udpipe.sh`). */
  | { state: "no-engine" };

export type ModelStatus =
  | { state: "installed" }
  | { state: "downloading"; percent: number | null }
  | { state: "failed"; message: string }
  | { state: "missing" }
  | { state: "unsupported" };

interface Options {
  db: Db;
  /** null when there's no UDPipe binary. */
  lemmatizer: () => Lemmatizer | null;
  modelDir: string;
  fetchFn?: typeof fetch;
}

/**
 * Lemmatises subtitles in the background, one at a time, downloading a
 * language's model the first time it is needed. The result is a
 * `subtitle_lemmas` row; while there is none, `status` says why.
 */
export function createLemmas({ db, lemmatizer, modelDir, fetchFn }: Options) {
  const pending = new Set<number>();
  const downloads = new Map<string, Promise<string>>();
  const progress = new Map<string, number | null>();
  const failures = new Map<string, string>();
  let chain: Promise<void> = Promise.resolve();

  function model(language: string): Promise<string> {
    const installed = installedModel(language, modelDir);
    if (installed) return Promise.resolve(installed);
    const entry = modelEntry(language);
    if (!entry) return Promise.reject(new Error(`No model for ${language}.`));
    let download = downloads.get(language);
    if (!download) {
      failures.delete(language);
      progress.set(language, null);
      download = downloadModel(entry, modelDir, fetchFn, (bytes, total) =>
        progress.set(language, total ? Math.floor((bytes / total) * 100) : null),
      )
        .catch((error: Error) => {
          failures.set(language, error.message || "The download failed.");
          throw error;
        })
        .finally(() => {
          downloads.delete(language);
          progress.delete(language);
        });
      downloads.set(language, download);
    }
    return download;
  }

  async function lemmatize(subtitleId: number) {
    const subtitle = db.select().from(schema.subtitles).where(eq(schema.subtitles.id, subtitleId)).get();
    const run = lemmatizer();
    if (!subtitle || !run || !modelEntry(subtitle.language)) return;
    if (
      db.select().from(schema.subtitleLemmas).where(eq(schema.subtitleLemmas.subtitleId, subtitleId)).get()
    ) {
      return;
    }
    let path: string;
    try {
      path = await model(subtitle.language);
    } catch {
      return; // the language's failure is what status reports, for every subtitle in it
    }
    const save = (values: Omit<typeof schema.subtitleLemmas.$inferInsert, "subtitleId">) =>
      db
        .insert(schema.subtitleLemmas)
        .values({ subtitleId, ...values })
        .onConflictDoNothing()
        .run();
    try {
      const tokens = await run(
        parseSubtitle(subtitle.content).map((cue) => cue.text),
        path,
      );
      save({ state: "done", tokens, model: modelEntry(subtitle.language)?.file });
    } catch (error) {
      save({ state: "failed", message: (error as Error).message || "UDPipe failed." });
    }
  }

  return {
    /** Lemmatise a subtitle soon, unless it is done or already waiting. */
    queue(subtitleId: number) {
      if (pending.has(subtitleId)) return;
      pending.add(subtitleId);
      chain = chain
        .then(() => lemmatize(subtitleId))
        .catch((error) => console.error("[learnarr] lemmatising failed", error))
        .finally(() => pending.delete(subtitleId));
    },

    /** Queue every subtitle that has no lemmas yet, in the languages there is a model for. */
    resume(language?: string) {
      const rows = db
        .select({ id: schema.subtitles.id, language: schema.subtitles.language })
        .from(schema.subtitles)
        .leftJoin(schema.subtitleLemmas, eq(schema.subtitleLemmas.subtitleId, schema.subtitles.id))
        .where(
          and(
            isNull(schema.subtitleLemmas.subtitleId),
            language ? eq(schema.subtitles.language, language) : undefined,
          ),
        )
        .all();
      for (const row of rows) if (modelEntry(row.language)) this.queue(row.id);
      return rows.length;
    },

    /** Forget a failure and try again: the model download, or one subtitle. */
    retry(subtitle: { id: number; language: string }) {
      failures.delete(subtitle.language);
      db.delete(schema.subtitleLemmas)
        .where(
          and(eq(schema.subtitleLemmas.subtitleId, subtitle.id), eq(schema.subtitleLemmas.state, "failed")),
        )
        .run();
      this.resume(subtitle.language);
    },

    status(subtitle: { id: number; language: string }): LemmaStatus {
      const row = db
        .select({ state: schema.subtitleLemmas.state, message: schema.subtitleLemmas.message })
        .from(schema.subtitleLemmas)
        .where(eq(schema.subtitleLemmas.subtitleId, subtitle.id))
        .get();
      if (row?.state === "done") return { state: "done" };
      if (row) return { state: "failed", message: row.message ?? "UDPipe failed." };
      if (!modelEntry(subtitle.language)) return { state: "unsupported" };
      if (!lemmatizer()) return { state: "no-engine" };
      const failure = failures.get(subtitle.language);
      if (failure) return { state: "model-failed", message: failure };
      if (downloads.has(subtitle.language)) {
        return { state: "downloading-model", percent: progress.get(subtitle.language) ?? null };
      }
      if (!pending.has(subtitle.id)) this.queue(subtitle.id);
      return { state: "working" };
    },

    modelStatus(language: string): ModelStatus {
      if (!modelEntry(language)) return { state: "unsupported" };
      if (installedModel(language, modelDir)) return { state: "installed" };
      if (downloads.has(language)) return { state: "downloading", percent: progress.get(language) ?? null };
      const failure = failures.get(language);
      return failure ? { state: "failed", message: failure } : { state: "missing" };
    },

    /** Start downloading a language's model ahead of need, e.g. when someone picks it to learn. */
    prepare(language: string, { retry = false } = {}) {
      if (!modelEntry(language) || !lemmatizer()) return;
      if (failures.has(language) && !retry) return;
      model(language).then(
        () => this.resume(language),
        () => {},
      );
    },

    hasEngine: () => lemmatizer() !== null,

    /** Settles when everything queued so far is finished, for tests. */
    idle: () => chain,
  };
}

export type Lemmas = ReturnType<typeof createLemmas>;

let shared: Lemmas | undefined;

export function useLemmas(): Lemmas {
  shared ??= createLemmas({
    db: useDb(),
    lemmatizer: () => (fs.existsSync(UDPIPE_BIN) ? udpipe(UDPIPE_BIN) : null),
    modelDir: MODEL_DIR,
  });
  return shared;
}

/** The tokens of a lemmatised subtitle, or null. */
export function subtitleTokens(db: Db, subtitleId: number) {
  return (
    db
      .select({ tokens: schema.subtitleLemmas.tokens })
      .from(schema.subtitleLemmas)
      .where(and(eq(schema.subtitleLemmas.subtitleId, subtitleId), eq(schema.subtitleLemmas.state, "done")))
      .get()?.tokens ?? null
  );
}
