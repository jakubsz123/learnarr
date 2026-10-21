import { useDb } from "~~/server/db";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return systemStatus(useDb(), useSettings());
});
