import { defineEventHandler, getRequestHeader, readMultipartFormData } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { useLemmas } from "~~/server/utils/lemmas";
import { useMediaServer } from "~~/server/utils/media";
import { MAX_SUBTITLE_BYTES, uploadSubtitle } from "~~/server/utils/subtitleSource";
import { mediaIdParam, validParams } from "~~/server/utils/validate";

const FORM_OVERHEAD_BYTES = 64 * 1024;

/** Use an .srt, .vtt or .ass file the learner uploads as this film or episode's subtitle. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, mediaIdParam);
  // Refuse an oversized body before reading it into memory; the form adds a little around the file.
  const length = Number(getRequestHeader(event, "content-length"));
  if (length > MAX_SUBTITLE_BYTES + FORM_OVERHEAD_BYTES) throw new AppError(413, "errors.subtitles.tooLarge");
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
