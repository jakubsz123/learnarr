import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { useLemmas } from "~~/server/utils/lemmas";
import { ownSubtitle } from "~~/server/utils/ownSubtitle";
import { idParam, validParams } from "~~/server/utils/validate";

/** Try lemmatising a subtitle again after it, or its language's model download, failed. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  const lemmas = useLemmas();
  const subtitle = ownSubtitle(useDb(), user.id, id);
  lemmas.retry(subtitle);
  return { lemmas: lemmas.status(subtitle) };
});
