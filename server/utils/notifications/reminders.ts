import { and, count, eq, gte } from "drizzle-orm";
import { startOfDay } from "#shared/days";
import { translate } from "#shared/messages";
import { schema, type Db } from "../../db";
import { studyQueue } from "../cards";
import { notifyUser } from "./index";

/** The hour of the day (in the server's time zone, TZ) practice reminders go out. */
export function reminderHour(env: NodeJS.ProcessEnv = process.env): number {
  const hour = Number(env.REMINDER_HOUR);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 18;
}

/**
 * Remind everyone who has cards waiting and hasn't studied today, once a day,
 * from the reminder hour on. Called every few minutes; returns who was reminded.
 */
export async function sendPracticeReminders(db: Db, now = Date.now()): Promise<string[]> {
  if (new Date(now).getHours() < reminderHour()) return [];
  const today = new Date(startOfDay(now));
  const reminded: string[] = [];
  for (const user of db.select().from(schema.user).where(eq(schema.user.practiceReminders, true)).all()) {
    if (user.lastRemindedAt && user.lastRemindedAt >= today) continue;
    const studiedToday =
      (db
        .select({ n: count() })
        .from(schema.reviews)
        .where(and(eq(schema.reviews.userId, user.id), gte(schema.reviews.reviewedAt, today)))
        .get()?.n ?? 0) > 0;
    const waiting = studyQueue(db, user.id, user.learningLanguage, now).total;
    if (studiedToday || waiting === 0) continue;
    const sent = await notifyUser(db, user.id, {
      title: translate(user.locale, "notifications.practice.title"),
      body: translate(user.locale, "notifications.practice.body", { count: waiting }),
      url: "/study",
    });
    if (!sent) continue;
    db.update(schema.user)
      .set({ lastRemindedAt: new Date(now) })
      .where(eq(schema.user.id, user.id))
      .run();
    reminded.push(user.id);
  }
  return reminded;
}
