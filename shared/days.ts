/**
 * Calendar days in the server's time zone (the `TZ` environment variable, UTC
 * if unset). A household shares one time zone, so "today" for the daily new-card
 * limit, the streak and reminders is the same for everyone on a server.
 */

/** Midnight at the start of the day `ms` falls on, as a timestamp. */
export function startOfDay(ms: number): number {
  const day = new Date(ms);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

/** A number that goes up by one each calendar day, for comparing days. */
export function dayNumber(ms: number): number {
  const day = new Date(ms);
  return Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86_400_000;
}
