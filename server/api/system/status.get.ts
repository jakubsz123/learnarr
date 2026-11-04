import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireAdmin } from "~~/server/utils/auth";
import { useLemmas } from "~~/server/utils/lemmas";
import { useSettings } from "~~/server/utils/settings";
import { systemStatus } from "~~/server/utils/systemStatus";

/** Health checks and facts about this server, for System → Status. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return systemStatus(useDb(), useSettings(), useLemmas());
});
