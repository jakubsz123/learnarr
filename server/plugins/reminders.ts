import { defineNitroPlugin } from "nitropack/runtime";
import { useDb } from "../db";
import { sendPracticeReminders } from "../utils/notifications/reminders";

const TICK_MS = 5 * 60 * 1000;

/** Check every few minutes whether it's time to remind anyone to study. */
export default defineNitroPlugin((nitro) => {
  const timer = setInterval(() => {
    sendPracticeReminders(useDb()).catch((error) =>
      console.warn("[learnarr] practice reminders failed", error),
    );
  }, TICK_MS);
  timer.unref();
  nitro.hooks.hook("close", () => clearInterval(timer));
});
