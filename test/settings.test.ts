import { describe, expect, it } from "vitest";
import { testDb } from "./helpers";
import { createSettings } from "../server/utils/settings";

describe("settings", () => {
  it("prefers the environment, keeps secrets encrypted, and reports pinned groups", () => {
    const db = testDb();
    const settings = createSettings(db, { AI_MODEL: "from-env" });
    settings.set("ai.model", "from-app");
    settings.set("ai.apiKey", "sk-secret");
    settings.set("media.url", "http://plex:32400");
    expect(settings.get("ai.model")).toBe("from-env");
    expect(settings.get("ai.apiKey")).toBe("sk-secret");
    expect(db.$client.prepare("select value from settings where key = 'ai.apiKey'").get()).not.toEqual({
      value: "sk-secret",
    });
    expect(settings.isPinned("ai")).toBe(true);
    expect(settings.isPinned("media")).toBe(false);
    settings.set("media.url", null);
    expect(settings.get("media.url")).toBeNull();
  });
});
