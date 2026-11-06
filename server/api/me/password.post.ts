import { APIError } from "better-auth/api";
import { defineEventHandler } from "h3";
import { z } from "zod";
import { requireUser, useAuth } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { validBody } from "~~/server/utils/validate";

const body = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

/** Change your own password. Your other sign-ins are signed out. */
export default defineEventHandler(async (event) => {
  await requireUser(event);
  const { currentPassword, newPassword } = await validBody(event, body);
  try {
    await useAuth().api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: event.headers,
    });
  } catch (error) {
    if (error instanceof APIError) throw new AppError(400, "errors.account.wrongPassword");
    throw error;
  }
  return { changed: true };
});
