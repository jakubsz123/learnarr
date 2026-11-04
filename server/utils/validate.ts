import { getQuery, getRouterParams, readBody, type H3Event } from "h3";
import { z } from "zod";
import { AppError } from "./errors";

/**
 * Reading a request's input through a zod schema. Anything that doesn't fit is
 * a 400 naming the first problem, so a route never sees unchecked input.
 */
function check<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
  throw new AppError(400, "errors.invalidRequest", { detail: `${where}${issue?.message ?? "invalid"}` });
}

export async function validBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  return check(schema, await readBody(event).catch(() => undefined));
}

export function validQuery<T extends z.ZodType>(event: H3Event, schema: T): z.infer<T> {
  return check(schema, getQuery(event));
}

export function validParams<T extends z.ZodType>(event: H3Event, schema: T): z.infer<T> {
  return check(schema, getRouterParams(event, { decode: true }));
}

/** `:id` of one of Learnarr's own rows. */
export const idParam = z.object({ id: z.coerce.number().int().positive() });

/** `:id` of an item on the media server, which is the server's own string. */
export const mediaIdParam = z.object({ id: z.string().min(1).max(100) });
