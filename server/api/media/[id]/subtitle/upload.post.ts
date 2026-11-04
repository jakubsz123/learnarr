import { defineEventHandler, readMultipartFormData } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { useLemmas } from "~~/server/utils/lemmas";
import { useMediaServer } from "~~/server/utils/media";
import { MAX_SUBTITLE_BYTES, uploadSubtitle } from "~~/server/utils/subtitleSource";
import { mediaIdParam, validParams } from "~~/server/utils/validate";

/** Use an .srt, .vtt or .ass file the learner uploads as this film or episode's subtitle. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, mediaIdParam);
  const file = (await readMultipartFormData(event).catch(() => undefined))?.find(
    (part) => part.name === "file",
  );
  if (!file?.data.length) throw new AppError(400, "errors.subtitles.unreadable");
  if (file.data.length > MAX_SUBTITLE_BYTES) throw new AppError(413, "errors.subtitles.tooLarge");
  const subtitle = await uploadSubtitle({
    db: useDb(),
    server: useMediaServer(),
    user,
    serverItemId: id,
    raw: new TextDecoder("utf-8").decode(file.data),
  });
  useLemmas().queue(subtitle.id);
  return { id: subtitle.id, source: subtitle.source, cueCount: subtitle.cueCount };
});
