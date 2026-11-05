import { defineEventHandler } from "h3";
import { z } from "zod";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { useLemmas } from "~~/server/utils/lemmas";
import { readSubtitleForm } from "~~/server/utils/subtitleForm";
import { addUpload } from "~~/server/utils/subtitleSource";

const title = z.string().trim().min(1).max(200);

/** Start from a subtitle file of your own, under a title you give it. Answers with the new item's id. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { raw, fields } = await readSubtitleForm(event);
  const named = title.safeParse(fields.title);
  if (!named.success) throw new AppError(400, "errors.uploads.needTitle");
  const { mediaItem, subtitle } = addUpload(useDb(), user, { title: named.data, raw });
  useLemmas().queue(subtitle.id);
  return { id: mediaItem.serverItemId };
});
