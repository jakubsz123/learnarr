import { defineEventHandler } from "h3";
import { z } from "zod";
import { useDb } from "~~/server/db";
import { AppError } from "~~/server/utils/errors";
import { findInvite } from "~~/server/utils/invites";
import { validParams } from "~~/server/utils/validate";

const params = z.object({ token: z.string().min(1).max(100) });

/** What an invite link is for, so its page can ask for the right things. Public: the token is the key. */
export default defineEventHandler((event) => {
  const { token } = validParams(event, params);
  const invite = findInvite(useDb(), token);
  if (!invite) throw new AppError(404, "errors.invites.invalid");
  return invite.userId ? { kind: "reset" as const, name: invite.name } : { kind: "new" as const, name: null };
});
