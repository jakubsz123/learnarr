import { APIError } from "better-auth/api";
import { z } from "zod";

const body = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
  password: z.string().min(8).max(128),
});

/**
 * The admin adds a household member. It goes through better-auth's sign-up so the
 * password is hashed the same way; no request headers are passed, so the admin's
 * own session is untouched.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { name, email, password } = await validBody(event, body);
  try {
    const { user } = await asAdminCreatingAccount(() =>
      useAuth().api.signUpEmail({ body: { name, email, password } }),
    );
    return { id: user.id, name: user.name, email: user.email };
  } catch (error) {
    if (error instanceof APIError)
      throw createError({ statusCode: 400, statusMessage: error.message || "Couldn't add that account." });
    throw error;
  }
});
