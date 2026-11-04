import { defineEventHandler } from "h3";
import { translate } from "#shared/messages";
import { useDb } from "~~/server/db";
import { requireUser } from "~~/server/utils/auth";
import { notifyUser } from "~~/server/utils/notifications";

/** Send a test notification to every channel the person set up. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const sent = await notifyUser(useDb(), user.id, {
    title: translate(user.locale, "notifications.test.title"),
    body: translate(user.locale, "notifications.test.body"),
    url: "/settings/notifications",
  });
  return { sent };
});
