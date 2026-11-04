import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { undoReview } from "~~/server/utils/reviews";
import { idParam, validParams } from "~~/server/utils/validate";

/** Take back the card's last answer. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const { id } = validParams(event, idParam);
  undoReview(useDb(), user.id, id);
  return { undone: true };
});
