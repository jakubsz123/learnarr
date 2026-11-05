import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { useLemmas } from "~~/server/utils/lemmas";
import { mediaSourceFor } from "~~/server/utils/media";
import { getSubtitle } from "~~/server/utils/subtitleSource";
import { mediaIdParam, validParams } from "~~/server/utils/validate";

/** Get this film or episode's subtitle in the user's learning language. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, mediaIdParam);
  const subtitle = await getSubtitle({
    db: useDb(),
    server: mediaSourceFor(id, user.id),
    user,
    serverItemId: id,
  });
  useLemmas().queue(subtitle.id);
  return { id: subtitle.id, source: subtitle.source, cueCount: subtitle.cueCount };
});
