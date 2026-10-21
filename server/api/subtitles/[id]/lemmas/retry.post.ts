import { z } from "zod";
import { useDb } from "~~/server/db";
import { useLemmas } from "~~/server/utils/lemmas";

const params = z.object({ id: z.coerce.number().int().positive() });

/** Try lemmatising a subtitle again after it, or its language's model download, failed. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, params);
  const lemmas = useLemmas();
  const subtitle = ownSubtitle(useDb(), user.id, id);
  lemmas.retry(subtitle);
  return { lemmas: lemmas.status(subtitle) };
});
