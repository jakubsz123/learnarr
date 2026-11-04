import { and, asc, eq } from "drizzle-orm";
import { defineEventHandler, setResponseHeaders } from "h3";
import { ANKI_FIELDS, escapeHtml, sentenceHtml } from "#shared/sentence";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { mediaTitle } from "#shared/mediaLabels";

/** A field can't hold the file's own separators, and the file is read as HTML. */
const text = (value: string | null) => escapeHtml(value ?? "").replace(/[\t\r\n]+/g, " ");
const html = (value: string) => value.replace(/[\t\r\n]+/g, " ");

/**
 * The learner's cards as a file Anki imports (File → Import), in the same
 * fields as the "Learnarr" note type AnkiConnect creates. The header lines are
 * Anki's own import options, so it needs no setting up.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const rows = useDb()
    .select({ card: schema.cards, item: schema.mediaItems })
    .from(schema.cards)
    .leftJoin(schema.mediaItems, eq(schema.cards.mediaItemId, schema.mediaItems.id))
    .where(and(eq(schema.cards.userId, user.id), eq(schema.cards.language, user.learningLanguage)))
    .orderBy(asc(schema.cards.createdAt), asc(schema.cards.id))
    .all();
  const lines = [
    "#separator:tab",
    "#html:true",
    `#columns:${ANKI_FIELDS.join("\t")}`,
    ...rows.map(({ card, item }) =>
      [
        text(card.term),
        text(card.translation),
        html(sentenceHtml(card.sentence, card.form)),
        text([card.partOfSpeech, card.note].filter(Boolean).join(" · ")),
        text(item ? mediaTitle(item) : ""),
      ].join("\t"),
    ),
  ];
  setResponseHeaders(event, {
    "content-type": "text/tab-separated-values; charset=utf-8",
    "content-disposition": `attachment; filename="learnarr-${user.learningLanguage}.txt"`,
  });
  return `${lines.join("\n")}\n`;
});
