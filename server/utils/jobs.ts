import crypto from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { schema, type Db } from "../db";

type Job = typeof schema.jobs.$inferSelect;

/**
 * Background work the browser polls for. The state lives in the database, so a
 * job that was running when the server restarted reads as failed, not as
 * spinning forever.
 */
export function createJobRunner(db: Db, concurrency = 2) {
  let running = 0;
  const waiting: (() => void)[] = [];

  async function slot<T>(work: () => Promise<T>): Promise<T> {
    if (running >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await work();
    } finally {
      running--;
      waiting.shift()?.();
    }
  }

  const update = (id: string, values: Partial<Job>) =>
    db
      .update(schema.jobs)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(schema.jobs.id, id))
      .run();

  return {
    /** Start `work` in the background and return its job row straight away. */
    start(kind: Job["kind"], userId: string, subjectId: number | null, work: () => Promise<unknown>): Job {
      const job = db
        .insert(schema.jobs)
        .values({ id: crypto.randomUUID(), kind, userId, subjectId })
        .returning()
        .get();
      void slot(async () => {
        update(job.id, { state: "running" });
        try {
          update(job.id, { state: "done", result: (await work()) ?? null });
        } catch (error) {
          update(job.id, { state: "failed", message: (error as Error).message || "Something went wrong." });
        }
      });
      return job;
    },

    /** The job if it belongs to this user. */
    get(id: string, userId: string): Job | undefined {
      return db
        .select()
        .from(schema.jobs)
        .where(and(eq(schema.jobs.id, id), eq(schema.jobs.userId, userId)))
        .get();
    },

    /** The unfinished job of a kind for a subject, so a second click joins it. */
    active(kind: Job["kind"], userId: string, subjectId: number): Job | undefined {
      return db
        .select()
        .from(schema.jobs)
        .where(
          and(
            eq(schema.jobs.kind, kind),
            eq(schema.jobs.userId, userId),
            eq(schema.jobs.subjectId, subjectId),
            inArray(schema.jobs.state, ["queued", "running"]),
          ),
        )
        .get();
    },

    failInterrupted(): number {
      return db
        .update(schema.jobs)
        .set({
          state: "failed",
          message: "Interrupted by a server restart. Try again.",
          updatedAt: new Date(),
        })
        .where(inArray(schema.jobs.state, ["queued", "running"]))
        .run().changes;
    },
  };
}

let runner: ReturnType<typeof createJobRunner> | undefined;

export function useJobs(db: Db) {
  runner ??= createJobRunner(db);
  return runner;
}
