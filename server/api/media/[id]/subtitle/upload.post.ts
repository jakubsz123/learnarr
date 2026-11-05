import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { useLemmas } from "~~/server/utils/lemmas";
import { mediaSourceFor } from "~~/server/utils/media";
import { readSubtitleForm } from "~~/server/utils/subtitleForm";
import { uploadSubtitle } from "~~/server/utils/subtitleSource";
import { mediaIdParam, validParams } from "~~/server/utils/validate";

/** Use an .srt, .vtt or .ass file the learner uploads as this film or episode's subtitle. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, mediaIdParam);
  const { raw } = await readSubtitleForm(event);
  const subtitle = await uploadSubtitle({
    db: useDb(),
    server: mediaSourceFor(id, user.id),
    user,
    serverItemId: id,
    raw,
  });
  useLemmas().queue(subtitle.id);
  return { id: subtitle.id, source: subtitle.source, cueCount: subtitle.cueCount };
});
