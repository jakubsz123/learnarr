import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { translate } from "#shared/messages";
import { addUser, testDb } from "./helpers";
import { schema, type Db } from "../server/db";
import { sendNtfy } from "../server/utils/notifications/ntfy";
import {
  forgetRecentPlaysForTests,
  jellyfinPlay,
  onPlay,
  plexPlay,
} from "../server/utils/notifications/playback";
import { sendPush, vapidKeys } from "../server/utils/notifications/push";
import { sendPracticeReminders } from "../server/utils/notifications/reminders";

// Push keys for tests, made once in a scratch folder rather than the data folder.
vapidKeys(fs.mkdtempSync(path.join(os.tmpdir(), "learnarr-push-")));

describe("messages", () => {
  it("picks the plural form for the count", () => {
    expect(translate("en", "notifications.practice.body", { count: 1 })).toBe("1 card is waiting for you.");
    expect(translate("en", "notifications.practice.body", { count: 4 })).toBe("4 cards are waiting for you.");
    expect(translate("xx", "errors.subtitles.noneOnServer", { language: "es" })).toMatch(
      /no Spanish subtitle/,
    );
  });
});

describe("media server webhooks", () => {
  it("reads a Plex play and ignores other events", () => {
    const payload = {
      event: "media.play",
      Account: { title: "jakub" },
      Metadata: {
        type: "episode",
        ratingKey: 42,
        title: "Pilot",
        grandparentTitle: "Élite",
        parentIndex: 1,
        index: 3,
      },
    };
    expect(plexPlay(payload)).toEqual({
      server: "plex",
      account: "jakub",
      itemId: "42",
      kind: "episode",
      title: "Pilot",
      showTitle: "Élite",
      seasonNumber: 1,
      episodeNumber: 3,
    });
    expect(plexPlay({ ...payload, event: "media.pause" })).toBeNull();
    expect(plexPlay({ ...payload, Metadata: { type: "track", ratingKey: 1 } })).toBeNull();
  });

  it("reads a Jellyfin playback start", () => {
    expect(
      jellyfinPlay({ NotificationType: "PlaybackStart", ItemType: "Movie", ItemId: "abc", Name: "Roma" }),
    ).toMatchObject({ server: "jellyfin", itemId: "abc", kind: "movie", title: "Roma", account: null });
    expect(jellyfinPlay({ NotificationType: "PlaybackStop", ItemType: "Movie", ItemId: "abc" })).toBeNull();
  });
});

describe("notifying people", () => {
  let db: Db;
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  const fakeNtfy = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response("{}");
  }) as unknown as typeof fetch;

  beforeEach(() => {
    db = testDb();
    sent.length = 0;
    forgetRecentPlaysForTests();
  });

  it("sends ntfy messages to the person's topic", async () => {
    await sendNtfy(
      "my-topic",
      { title: "T", body: "B", url: "/study" },
      { server: "https://ntfy.example", fetchFn: fakeNtfy },
    );
    expect(sent[0]).toMatchObject({
      url: "https://ntfy.example",
      body: { topic: "my-topic", title: "T", message: "B" },
    });
  });

  it("forgets a push device that's gone", async () => {
    const user = addUser(db);
    db.insert(schema.pushSubscriptions)
      .values([
        { userId: user.id, endpoint: "https://push.example/1", p256dh: "k", auth: "a" },
        { userId: user.id, endpoint: "https://push.example/2", p256dh: "k", auth: "a" },
      ])
      .run();
    const send = (async (subscription: { endpoint: string }) => {
      if (subscription.endpoint.endsWith("/2")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      return {};
    }) as never;
    expect(await sendPush(db, user.id, { title: "T", body: "B", url: "/" }, send)).toBe(1);
    expect(
      db
        .select()
        .from(schema.pushSubscriptions)
        .all()
        .map((d) => d.endpoint),
    ).toEqual(["https://push.example/1"]);
  });

  it("offers the words of what someone just started watching, once", async () => {
    addUser(db, { mediaServerUser: "Jakub" });
    const sentTo: { title: string; body: string }[] = [];
    const notify = async (_db: Db, _userId: string, message: { title: string; body: string }) => {
      sentTo.push(message);
      return true;
    };
    const play = {
      server: "plex" as const,
      account: "jakub",
      itemId: "42",
      kind: "episode" as const,
      title: "Pilot",
      showTitle: "Élite",
      seasonNumber: 1,
      episodeNumber: 3,
    };
    expect(await onPlay(db, play, 0, notify)).toHaveLength(1);
    expect(sentTo[0]?.title).toBe("Before you watch Élite · S1 E3");
    // A pause and resume a minute later doesn't notify again; someone else's play never does.
    expect(await onPlay(db, play, 60_000, notify)).toEqual([]);
    expect(await onPlay(db, { ...play, account: "someone else", itemId: "43" }, 0, notify)).toEqual([]);
  });

  it("only counts a subtitle from the media server that reported the play", async () => {
    const user = addUser(db, { mediaServerUser: "Jakub", learningLanguage: "es" });
    const item = db
      .insert(schema.mediaItems)
      .values({ server: "plex", serverItemId: "42", kind: "movie", title: "Roma" })
      .returning()
      .get();
    db.insert(schema.subtitles)
      .values({
        userId: user.id,
        mediaItemId: item.id,
        language: "es",
        source: "plex",
        content: "",
        cueCount: 0,
      })
      .run();
    const bodies: string[] = [];
    const notify = async (_db: Db, _userId: string, message: { body: string }) => {
      bodies.push(message.body);
      return true;
    };
    const play = {
      account: "jakub",
      itemId: "42",
      kind: "movie" as const,
      title: "Roma",
      showTitle: null,
      seasonNumber: null,
      episodeNumber: null,
    };
    await onPlay(db, { ...play, server: "jellyfin" }, 0, notify);
    await onPlay(db, { ...play, server: "plex" }, 0, notify);
    expect(bodies[0]).toBe(translate("en", "notifications.beforeYouWatch.noSubtitle"));
    expect(bodies[1]).toBe(translate("en", "notifications.beforeYouWatch.words"));
  });

  it("tries again later when nothing could be sent", async () => {
    addUser(db, { mediaServerUser: "Jakub" });
    const play = {
      server: "plex" as const,
      account: "Jakub",
      itemId: "7",
      kind: "movie" as const,
      title: "Roma",
      showTitle: null,
      seasonNumber: null,
      episodeNumber: null,
    };
    expect(await onPlay(db, play, 0, async () => false)).toEqual([]);
    expect(await onPlay(db, play, 1000, async () => true)).toHaveLength(1);
  });
});

const alwaysSent = async () => true;

describe("practice reminders", () => {
  it("skips people with nothing due, and those who studied today", async () => {
    const db = testDb();
    addUser(db, { ntfyTopic: "t" });
    const evening = new Date(2026, 10, 4, 20).getTime();
    expect(await sendPracticeReminders(db, evening, alwaysSent)).toEqual([]);
    const morning = new Date(2026, 10, 4, 7).getTime();
    expect(await sendPracticeReminders(db, morning, alwaysSent)).toEqual([]);
  });

  it("reminds only people who set up a way to be notified", async () => {
    const db = testDb();
    const withTopic = addUser(db, { ntfyTopic: "t" });
    const without = addUser(db);
    for (const user of [withTopic, without]) {
      db.insert(schema.cards)
        .values({
          userId: user.id,
          language: "es",
          term: "gato",
          form: "gato",
          translation: "cat",
          sentence: "Un gato.",
        })
        .run();
    }
    const evening = new Date(2026, 10, 4, 20).getTime();
    expect(await sendPracticeReminders(db, evening, alwaysSent)).toEqual([withTopic.id]);
  });
});
