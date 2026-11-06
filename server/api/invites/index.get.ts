import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireAdmin } from "~~/server/utils/auth";
import { pendingInvites } from "~~/server/utils/invites";

/** The links that haven't been used or expired yet. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  return { invites: pendingInvites(useDb()) };
});
