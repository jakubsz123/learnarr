import { useDb } from "../db";
import { useJobs } from "../utils/jobs";
import { useLemmas } from "../utils/lemmas";

/**
 * Open the database (running any pending migrations), close out jobs a restart
 * cut short, and pick up lemmatising where it stopped.
 */
export default defineNitroPlugin(() => {
  const failed = useJobs(useDb()).failInterrupted();
  if (failed) console.log(`[learnarr] ${failed} job(s) were interrupted by the restart`);
  const lemmas = useLemmas();
  if (lemmas.hasEngine()) lemmas.resume();
});
