import { useDb } from "~~/server/db";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return { count: studyQueue(useDb(), user.id, user.learningLanguage).total };
});
