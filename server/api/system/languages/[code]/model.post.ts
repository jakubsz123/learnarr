import { z } from "zod";
import { LANGUAGE_CODES } from "#shared/languages";
import { useLemmas } from "~~/server/utils/lemmas";

const params = z.object({ code: z.enum(LANGUAGE_CODES) });

/** Download a language's lemmatiser model now (or again, after a failed try). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const { code } = validParams(event, params);
  const lemmas = useLemmas();
  lemmas.prepare(code, { retry: true });
  return { model: lemmas.modelStatus(code) };
});
