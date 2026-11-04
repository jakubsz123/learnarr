import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
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
    ).toMatchObject({ itemId: "abc", kind: "movie", title: "Roma", account: null });
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
    const user = addUser(db, { mediaServerUser: "Jakub" });
    db.insert(schema.pushSubscriptions)
      .values({ userId: user.id, endpoint: "https://p/1", p256dh: "k", auth: "a" })
      .run();
    const play = {
      account: "jakub",
      itemId: "42",
      kind: "episode" as const,
      title: "Pilot",
      showTitle: "Élite",
      seasonNumber: 1,
      episodeNumber: 3,
    };
    // No device answers in a test, so nothing counts as sent; the dedupe still applies.
    expect(await onPlay(db, play)).toEqual([]);
    db.update(schema.user).set({ ntfyTopic: "t" }).where(eq(schema.user.id, user.id)).run();
    expect(await onPlay(db, play)).toEqual([]);
    expect(await onPlay(db, { ...play, account: "someone else", itemId: "43" })).toEqual([]);
  });
});

describe("practice reminders", () => {
  it("skips people with nothing due, and those who studied today", async () => {
    const db = testDb();
    addUser(db, { ntfyTopic: "t" });
    const evening = new Date(2026, 10, 4, 20).getTime();
    expect(await sendPracticeReminders(db, evening)).toEqual([]);
    const morning = new Date(2026, 10, 4, 7).getTime();
    expect(await sendPracticeReminders(db, morning)).toEqual([]);
  });
});
