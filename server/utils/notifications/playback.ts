import { and, count, eq } from "drizzle-orm";
import { translate } from "#shared/messages";
import { schema, type Db } from "../../db";
import { notifyUser } from "./index";

/** A play reported by the media server's webhook. */
export interface PlayEvent {
  /** The media server's user name for whoever pressed play. */
  account: string | null;
  itemId: string;
  kind: "movie" | "episode";
  title: string;
  showTitle: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

/** A pause and a resume, or two webhooks for one play, shouldn't notify twice. */
const REPEAT_WINDOW_MS = 3 * 60 * 1000;
const recent = new Map<string, number>();

/**
 * Whose play is it: the person whose media server user name matches, or, in a
 * one-person household that hasn't set it, that one person.
 */
function playersOf(db: Db, account: string | null) {
  const people = db.select().from(schema.user).where(eq(schema.user.watchReminders, true)).all();
  const named = account
    ? people.filter((u) => u.mediaServerUser?.trim().toLowerCase() === account.trim().toLowerCase())
    : [];
  if (named.length) return named;
  const total = db.select({ n: count() }).from(schema.user).get()?.n ?? 0;
  return total === 1 && people.length === 1 && !people[0]!.mediaServerUser ? people : [];
}

function displayTitle(play: PlayEvent): string {
  return play.kind === "episode" && play.showTitle
    ? `${play.showTitle} S${play.seasonNumber ?? "?"} E${play.episodeNumber ?? "?"}`
    : play.title;
}

/**
 * Someone pressed play: offer them the episode's words before they watch. If
 * they have its subtitle, say how many suggested words wait; if not, offer to
 * get it. Returns who was notified.
 */
export async function onPlay(db: Db, play: PlayEvent, now = Date.now()): Promise<string[]> {
  const notified: string[] = [];
  for (const user of playersOf(db, play.account)) {
    const key = `${user.id}:${play.itemId}`;
    if (now - (recent.get(key) ?? 0) < REPEAT_WINDOW_MS) continue;
    recent.set(key, now);

    const subtitle = db
      .select({ id: schema.subtitles.id })
      .from(schema.subtitles)
      .innerJoin(schema.mediaItems, eq(schema.subtitles.mediaItemId, schema.mediaItems.id))
      .where(
        and(
          eq(schema.subtitles.userId, user.id),
          eq(schema.subtitles.language, user.learningLanguage),
          eq(schema.mediaItems.serverItemId, play.itemId),
        ),
      )
      .get();
    const suggestions = subtitle
      ? (db
          .select({ n: count() })
          .from(schema.suggestions)
          .where(and(eq(schema.suggestions.subtitleId, subtitle.id), eq(schema.suggestions.userId, user.id)))
          .get()?.n ?? 0)
      : 0;
    const body = !subtitle
      ? translate(user.locale, "notifications.beforeYouWatch.noSubtitle")
      : suggestions
        ? translate(user.locale, "notifications.beforeYouWatch.suggestions", { count: suggestions })
        : translate(user.locale, "notifications.beforeYouWatch.words");
    const sent = await notifyUser(db, user.id, {
      title: translate(user.locale, "notifications.beforeYouWatch.title", { title: displayTitle(play) }),
      body,
      url: `/media/${encodeURIComponent(play.itemId)}`,
    });
    if (sent) notified.push(user.id);
  }
  return notified;
}

export function forgetRecentPlaysForTests() {
  recent.clear();
}

type Raw = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" && value ? value : null);
const num = (value: unknown) => (typeof value === "number" ? value : Number(value) || null);

/**
 * Plex's webhook (Plex Pass): a form with a JSON `payload`. Only the start of
 * a film or episode counts.
 */
export function plexPlay(payload: Raw): PlayEvent | null {
  if (payload.event !== "media.play") return null;
  const meta = (payload.Metadata ?? {}) as Raw;
  if (meta.type !== "episode" && meta.type !== "movie") return null;
  const itemId = text(String(meta.ratingKey ?? ""));
  if (!itemId) return null;
  return {
    account: text(((payload.Account ?? {}) as Raw).title),
    itemId,
    kind: meta.type,
    title: text(meta.title) ?? "",
    showTitle: text(meta.grandparentTitle),
    seasonNumber: num(meta.parentIndex),
    episodeNumber: num(meta.index),
  };
}

/** Jellyfin's Webhook plugin, sending all properties of a "Playback Start" notification. */
export function jellyfinPlay(payload: Raw): PlayEvent | null {
  if (payload.NotificationType !== "PlaybackStart") return null;
  const kind = payload.ItemType === "Episode" ? "episode" : payload.ItemType === "Movie" ? "movie" : null;
  const itemId = text(payload.ItemId);
  if (!kind || !itemId) return null;
  return {
    account: text(payload.NotificationUsername),
    itemId,
    kind,
    title: text(payload.Name) ?? "",
    showTitle: text(payload.SeriesName),
    seasonNumber: num(payload.SeasonNumber),
    episodeNumber: num(payload.EpisodeNumber),
  };
}
