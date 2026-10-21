import { useDb } from "~~/server/db";
import { useLemmas } from "~~/server/utils/lemmas";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return systemStatus(useDb(), useSettings(), useLemmas());
});
