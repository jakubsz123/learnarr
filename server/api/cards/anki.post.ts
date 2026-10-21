import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { schema, useDb } from "~~/server/db";

const body = z.object({
  links: z
    .array(z.object({ cardId: z.number().int().positive(), noteId: z.number().int().positive() }))
    .max(1000),
});

/** Remember which Anki note each card became, so it isn't sent twice. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { links } = await validBody(event, body);
  const db = useDb();
  db.transaction((tx) => {
    for (const { cardId, noteId } of links) {
      tx.update(schema.cards)
        .set({ ankiNoteId: noteId, updatedAt: new Date() })
        .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, user.id)))
        .run();
    }
  });
  return { linked: links.length };
});
