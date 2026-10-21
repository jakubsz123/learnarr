import { createError, getQuery, getRouterParams, readBody, type H3Event } from "h3";
import type { z } from "zod";

function check<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
  throw createError({ statusCode: 400, statusMessage: `${where}${issue?.message ?? "Invalid request"}` });
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
