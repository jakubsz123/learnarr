import { defineEventHandler } from "h3";
import { z } from "zod";
import { LANGUAGE_CODES } from "#shared/languages";
import { requireAdmin } from "~~/server/utils/auth";
import { useLemmas } from "~~/server/utils/lemmas";
import { validParams } from "~~/server/utils/validate";

const params = z.object({ code: z.enum(LANGUAGE_CODES) });

/** Download a language's lemmatiser model now (or again, after a failed try). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { code } = validParams(event, params);
  const lemmas = useLemmas();
  lemmas.prepare(code, { retry: true });
  return { model: lemmas.modelStatus(code) };
});
