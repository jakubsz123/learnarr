import { defineEventHandler } from "h3";
import { z } from "zod";
import { useDb } from "~~/server/db";
import { useAuth } from "~~/server/utils/auth";
import { acceptInvite } from "~~/server/utils/invites";
import { validBody, validParams } from "~~/server/utils/validate";

const params = z.object({ token: z.string().min(1).max(100) });
const body = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.email().max(200).optional(),
  password: z.string().min(8).max(128),
});

/** Use an invite link: create the account, or set the new password. Answers with the email to sign in with. */
export default defineEventHandler(async (event) => {
  const { token } = validParams(event, params);
  const answer = await validBody(event, body);
  return acceptInvite(useDb(), useAuth(), token, answer);
});
