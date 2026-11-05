import { describe, expect, it } from "vitest";
import { addUser, srtWith, testDb } from "./helpers";
import { isUploadId } from "../shared/mediaSources";
import { createUploads } from "../server/utils/media/uploads";
import { addUpload } from "../server/utils/subtitleSource";

describe("uploads", () => {
  it("turns a file into an item of the uploader's own, in the language they learn", async () => {
    const db = testDb();
    const jakub = addUser(db, { learningLanguage: "es" });
    const { mediaItem, subtitle } = addUpload(db, jakub, { title: "Voicemail from Ana", raw: srtWith(3) });
    expect(isUploadId(mediaItem.serverItemId)).toBe(true);
    expect(subtitle).toMatchObject({ userId: jakub.id, language: "es", source: "upload", cueCount: 3 });

    const uploads = createUploads(db, jakub.id);
    expect(await uploads.item(mediaItem.serverItemId)).toMatchObject({
      type: "movie",
      title: "Voicemail from Ana",
    });
    expect((await uploads.items("up", { start: 0, limit: 10, search: "ana" })).items).toHaveLength(1);
    expect((await uploads.items("up", { start: 0, limit: 10, search: "nothing" })).total).toBe(0);
  });

  it("keeps each person's uploads to themselves", async () => {
    const db = testDb();
    const jakub = addUser(db);
    const victor = addUser(db);
    const { mediaItem } = addUpload(db, jakub, { title: "Mine", raw: srtWith(3) });
    const theirs = createUploads(db, victor.id);
    expect((await theirs.items("up", { start: 0, limit: 10 })).total).toBe(0);
    await expect(theirs.item(mediaItem.serverItemId)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("refuses a file with no subtitle lines in it", () => {
    const db = testDb();
    expect(() => addUpload(db, addUser(db), { title: "Notes", raw: "just some text" })).toThrow();
  });
});
