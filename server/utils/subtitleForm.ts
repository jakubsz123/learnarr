import { getRequestHeader, readMultipartFormData, type H3Event } from "h3";
import { AppError } from "./errors";
import { MAX_SUBTITLE_BYTES } from "./subtitleSource";

/** Room for the form's own fields and boundaries around the file. */
const FORM_OVERHEAD_BYTES = 64 * 1024;

/**
 * Read an uploaded subtitle form: the file's text, and the other fields. An
 * oversized body is refused before it's read into memory.
 */
export async function readSubtitleForm(event: H3Event) {
  const length = Number(getRequestHeader(event, "content-length"));
  if (length > MAX_SUBTITLE_BYTES + FORM_OVERHEAD_BYTES) throw new AppError(413, "errors.subtitles.tooLarge");
  const parts = (await readMultipartFormData(event).catch(() => undefined)) ?? [];
  const file = parts.find((part) => part.name === "file");
  if (!file?.data.length) throw new AppError(400, "errors.subtitles.unreadable");
  if (file.data.length > MAX_SUBTITLE_BYTES) throw new AppError(413, "errors.subtitles.tooLarge");
  const fields: Record<string, string> = {};
  for (const part of parts)
    if (part.name && part.name !== "file") fields[part.name] = part.data.toString("utf8");
  return { raw: new TextDecoder("utf-8").decode(file.data), fields };
}
