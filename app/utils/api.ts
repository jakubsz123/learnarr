import type { NitroFetchOptions } from "nitropack";
import type { InternalApi } from "nitropack/types";

/**
 * Calling Learnarr's API: `$fetch` with the answer's type named, from the
 * types below. Letting `$fetch` infer it from the path is too deep for
 * TypeScript across this many routes, so every call says what it gets back.
 */
export function api<T = void>(path: string, options?: NitroFetchOptions<string>): Promise<T> {
  return $fetch<T>(path, options as never) as Promise<T>;
}

/**
 * Shapes of API answers, taken from the routes themselves, so the client can't
 * drift from the server.
 */
export type Get<Route extends keyof InternalApi> = InternalApi[Route] extends { get: infer T } ? T : never;
export type Put<Route extends keyof InternalApi> = InternalApi[Route] extends { put: infer T } ? T : never;
export type Post<Route extends keyof InternalApi> = InternalApi[Route] extends { post: infer T } ? T : never;

export type Me = Get<"/api/me">;
export type MediaResponse = Get<"/api/media/:id">;
export type MediaSummary = MediaResponse["item"];
export type Progress = MediaResponse["progress"][string];
export type SubtitleResponse = Get<"/api/subtitles/:id">;
export type Card = SubtitleResponse["cards"][number];
export type Suggestion = SubtitleResponse["suggestions"][number];
export type Cue = SubtitleResponse["cues"][number];
export type Transcript = SubtitleResponse["transcript"];
export type VocabEntry = Transcript["vocab"][number];
export type LemmaStatus = SubtitleResponse["lemmas"];
export type ListedCard = Get<"/api/cards">["cards"][number];
export type StudyCard = Get<"/api/study">["cards"][number];
export type Today = Get<"/api/today">;
export type NotificationSettings = Get<"/api/me/notifications">;
export type SystemStatus = Get<"/api/system/status">;
export type ModelStatus = SystemStatus["languages"][number]["model"];
export type Job = Get<"/api/jobs/:id">;
export type AnkiCard = Get<"/api/cards/anki">["cards"][number];
export type MadeCard = Post<"/api/subtitles/:id/cards">;
export type Library = Get<"/api/library">["libraries"][number];
export type LibraryPage = Get<"/api/library/:id/items">;
export type User = Get<"/api/users">["users"][number];
export type MediaServerSettings = Get<"/api/settings/media-server">;
export type AiSettings = Get<"/api/settings/ai">;
export type PlexPin = Post<"/api/plex/pin">;
export type PlexPinStatus = Get<"/api/plex/pin/:id">;
export type WebhookUrls = Get<"/api/settings/webhooks">;
export type Definitions = Get<"/api/dictionary">;
export type UpNext = Get<"/api/up-next">;
export type DecideResult = Post<"/api/suggestions">;
export type OpenSubtitlesAccount = Put<"/api/me/opensubtitles">;

export type { Decision } from "~~/server/utils/suggestions";
export type { WordUse } from "~~/server/utils/wordCards";
export type WordState = VocabEntry["state"];
