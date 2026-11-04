import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "../server/utils/requestOrigin";

const post = (origin: string | null, fetchSite: string | null = null, host = "nas:7979") => ({
  method: "POST",
  host,
  origin,
  fetchSite,
});

describe("request origins", () => {
  it("lets pages served by Learnarr itself write", () => {
    expect(isAllowedOrigin(post("http://nas:7979", "same-origin"))).toBe(true);
    expect(isAllowedOrigin(post("http://nas:7979"))).toBe(true);
    // Behind a TLS proxy, Learnarr sees http but the browser says https.
    expect(isAllowedOrigin(post("https://learnarr.example.com", null, "learnarr.example.com"))).toBe(true);
  });

  it("refuses another app on the same host, or a sibling subdomain", () => {
    expect(isAllowedOrigin(post("http://nas:8989", "same-site"))).toBe(false);
    expect(isAllowedOrigin(post("https://sonarr.example.com", "same-site", "learnarr.example.com"))).toBe(
      false,
    );
    expect(isAllowedOrigin(post("null", "cross-site"))).toBe(false);
  });

  it("lets reads through, and non-browser clients that send no origin", () => {
    expect(
      isAllowedOrigin({ method: "GET", host: "nas:7979", origin: "http://evil", fetchSite: "cross-site" }),
    ).toBe(true);
    expect(isAllowedOrigin(post(null))).toBe(true);
    expect(isAllowedOrigin(post(null, "cross-site"))).toBe(false);
  });
});
