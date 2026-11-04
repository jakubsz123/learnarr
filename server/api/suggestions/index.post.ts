import { defineEventHandler } from "h3";
import { z } from "zod";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { DECISIONS, decideSuggestions } from "~~/server/utils/suggestions";
import { validBody } from "~~/server/utils/validate";

const body = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  decision: z.enum(DECISIONS),
});

/** Learn, know or skip some of the AI's suggested words. Answers with the cards made. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { ids, decision } = await validBody(event, body);
  return { cards: decideSuggestions(useDb(), user.id, ids, decision) };
});
