import { useDb } from "../db";
import { useJobs } from "../utils/jobs";

/** Open the database (running any pending migrations) and close out jobs a restart cut short. */
export default defineNitroPlugin(() => {
  const failed = useJobs(useDb()).failInterrupted();
  if (failed) console.log(`[learnarr] ${failed} job(s) were interrupted by the restart`);
});
