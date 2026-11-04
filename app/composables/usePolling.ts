import type { Job } from "~/utils/api";

/** Thrown when the component that was polling goes away; callers can ignore it. */
export class PollingStopped extends Error {
  constructor() {
    super("stopped");
    this.name = "PollingStopped";
  }
}

/**
 * Asking the server again until something is finished: a background job, a
 * Plex sign-in. Polling stops when the component unmounts, and after a
 * deadline, so a page left open never polls forever.
 */
export function usePolling() {
  let stopped = false;
  onBeforeUnmount(() => (stopped = true));

  async function poll<T>(
    check: () => Promise<T>,
    done: (result: T) => boolean,
    { intervalMs = 2000, timeoutMs = 10 * 60_000 } = {},
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      if (stopped) throw new PollingStopped();
      const result = await check();
      if (done(result)) return result;
      if (Date.now() > deadline) throw new LocalError("errors.timedOut");
    }
  }

  return { poll };
}

/**
 * Wait for a background job (/api/jobs/:id) to finish. Resolves with its
 * result; rejects with its reason, in the reader's language, if it failed.
 */
export function useJob() {
  const { poll } = usePolling();
  const { reasonText } = useErrorMessage();
  const { t } = useI18n();
  return async function waitFor(jobId: string) {
    const job = await poll(
      () => api<Job>(`/api/jobs/${jobId}`),
      (j) => j.state === "done" || j.state === "failed",
    );
    if (job.state === "failed") {
      const reason = (job.result as { error?: Parameters<typeof reasonText>[0] } | null)?.error;
      throw new ShownError(reasonText(reason, job.message ?? t("errors.unknown")));
    }
    return job.result;
  };
}
