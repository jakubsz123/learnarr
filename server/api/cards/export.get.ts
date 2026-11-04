import { and, asc, eq } from "drizzle-orm";
import { defineEventHandler, setResponseHeaders } from "h3";
import { ANKI_FIELDS, sentenceHtml } from "#shared/sentence";
import { schema, useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { sourceLabel } from "~~/server/utils/mediaItems";

/** A field can't hold the file's own separators. */
const field = (value: string | null) => (value ?? "").replace(/[\t\r\n]+/g, " ");

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
        field(card.term),
        field(card.translation),
        field(sentenceHtml(card.sentence, card.form)),
        field([card.partOfSpeech, card.note].filter(Boolean).join(" · ")),
        field(item ? sourceLabel(item) : ""),
      ].join("\t"),
    ),
  ];
  setResponseHeaders(event, {
    "content-type": "text/tab-separated-values; charset=utf-8",
    "content-disposition": `attachment; filename="learnarr-${user.learningLanguage}.txt"`,
  });
  return `${lines.join("\n")}\n`;
});
