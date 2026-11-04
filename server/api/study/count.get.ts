import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { studyQueue } from "~~/server/utils/cards";

/** How many cards are waiting, for the Study badge. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return { count: studyQueue(useDb(), user.id, user.learningLanguage).total };
});
