# Handoff: v0.3 (branch `claude/v0.3`)

State of Learnarr after the v0.3 session, for whoever picks it up next. Branched from `main` at `e0ef5d0`,
not merged yet. CI is green on the branch: checks, 96 tests, the website build, and the Docker job, which
downloads a real model.

## What changed, by area

**Languages**

- All 94 UDPipe models in the UD 2.5 release are pinned in `server/utils/lemmas/udpipe-models.json`. The
  "Pin UDPipe models" workflow wrote the file from real downloads checked against LINDAT's MD5s; rerun it by
  hand if the pins ever need refreshing.
- `TREEBANKS` in `server/utils/lemmas/models.ts` maps 52 languages to one treebank each. Korean is left out on
  purpose.
- `shared/languages.ts` now offers 63 languages. `scripts/build-frequency.mjs` builds lists for 50.

**Server**

- One error type: `AppError` (`server/utils/errors.ts`) carries a message key from `i18n/locales/en.json`.
  Media server, AI, OpenSubtitles and model errors extend it, and routes no longer catch and re-map errors.
- Nitro auto-imports are off (`nitro.imports: false`): server files import everything explicitly.
- Routes are thin. Logic moved into `server/utils`: `cards.ts` (`createCard`), `reviews.ts` (answers and
  undo), `wordCards.ts`, `mediaItems.ts`, `subtitleSource.ts` (`uploadSubtitle`), `stats.ts`, `dictionary.ts`.
- `server/middleware/origin.ts` refuses API writes from other sites.
- Days follow the `TZ` environment variable (`shared/days.ts`).

**Notifications** (`server/utils/notifications/`)

- Web push, with VAPID keys generated into `/config/push.json` (`web-push` dependency).
- ntfy: a topic per person, `NTFY_URL`/`NTFY_TOKEN` for the server.
- Practice reminders from `REMINDER_HOUR`, run by `server/plugins/reminders.ts`.
- "Before you watch": `/api/webhooks/{plex,jellyfin}/<secret>`. A play is matched to a person by their media
  server user name.
- The PWA parts live in `public/`: `sw.js`, `manifest.webmanifest` and the icons.

**Other new features**

- Wiktionary definitions in the word sheet, cached for a month.
- Subtitle upload.
- Anki file export: `/api/cards/export`.
- Longest streak and twelve weeks of activity on Today.
- `/welcome`: first-sign-in questions for household members (`user.onboarded_at`).
- Settings → Notifications.
- Webhook addresses under Settings → Media server.

**Interface**

- @nuxtjs/i18n is installed and every string is in `en.json`. Language names come from `Intl.DisplayNames`;
  plurals use `Intl.PluralRules` (`i18n/i18n.config.ts`).
- The server uses the same catalog through `shared/messages.ts` (its `CATALOGS` list).
- `test/messages.test.ts` fails if the code uses a key the catalog doesn't have.
- Client requests go through `api<T>()` (`app/utils/api.ts`), with types taken from the routes.
  Plain `$fetch` inference hit TypeScript's depth limit, so it isn't used.
- The episode page is split into `MediaHeader`, `GetSubtitlePanel`, `EpisodeOverview`, `SuggestPanel`,
  `SuggestionList`, `VocabList`, `TranscriptView` and `WordSheet`.
- Shared composables: `usePolling`/`useJob`, `useFeedback`, `useErrorMessage`, `useLanguageNames`, `usePush`.
- Shared CSS patterns (`.list-box`, `.pill`, `.tabs`/`.tab`, `.icon-btn`) live in `app/assets/css/main.css`.

**Database**

- Migrations `0004_onboarding` and `0005_notifications_and_dictionary` are new and not yet released.
- 0004 sets `onboarded_at` for existing users.

**Website** (`website/`)

- The landing page moved to `public/`. The wiki is VitePress pages under `/wiki/`; it has its own
  `package.json` and `tsconfig.json`.
- The languages table is generated from the app's source at build time.
- CI builds the site but nothing deploys it.

**Documentation**

- `docs/architecture.md` (map of the code) and `CONTRIBUTING.md` (the conventions above).
- `CHANGELOG.md`, `SECURITY.md`, pull request and issue templates, Dependabot, `.nvmrc` (Node 24) and
  `.env.example`.
- The version is 0.3.0.

## Decisions made without asking

- New dependencies: `@nuxtjs/i18n`, `web-push` and `@types/web-push`; VitePress, which only the website uses.
- No DeepL fallback for definitions, because it would need an API key.
- English only for now. Polish was dropped earlier, at Jakub's request.
- The wiki uses `.html` addresses (`cleanUrls: false`), so it works on any static host.
- Push subscriptions must point at a known push service (`server/api/me/push.post.ts`).
- Deferred, as listed in `docs/plan.md`: following along live, a library sorted by "% you know", translating
  whole lines, decks per show, songs, books, the video player, and embedded tracks through ffmpeg.

## Still open

1. **Support links.** Set `support.coffee` and `support.github` in `website/.vitepress/config.ts`; the buttons
   on `wiki/support` stay hidden until they're set. Jakub hasn't given the addresses yet.
2. **Not yet tested for real:** a real Plex or Jellyfin, push notifications on a phone (they need HTTPS, or an
   iPhone with Learnarr on the home screen), and live Wiktionary lookups. The session's sandbox couldn't
   reach Wiktionary or LINDAT, but CI did download a real model.
3. **Merge.** No pull request has been opened yet.
4. **Publish the wiki.** Build it with `cd website && npm ci && npm run build` and upload `.vitepress/dist` to
   wherever learnarr.rushandhurry.us is served from.
5. **Known gap:** some failure details are shown in English even when the interface is in another language:
   raw UDPipe errors, zod validation details, and better-auth's own messages when adding a user.
