# How Learnarr is put together

A Nuxt 4 app: Vue pages in `app/`, an API in `server/`, and code both use in `shared/`. One process, one
SQLite database, no other services. This page is the map; the code's own comments say why things are the
way they are.

## A request, end to end

Take "make a card from a tapped word":

1. `app/components/EpisodeView.vue` hears the word sheet's `card` event and calls `useEpisodeWords().makeCard()`.
2. The composable calls `api<MadeCard>("/api/subtitles/12/cards", …)` (`app/utils/api.ts`). Every request
   names the type of its answer; the types are taken from the routes themselves, so the two sides can't
   drift.
3. `server/middleware/origin.ts` checks that the write comes from Learnarr's own page.
4. `server/api/subtitles/[id]/cards.post.ts` is the route. Routes are thin: they check who's asking
   (`requireUser`), read their input through a zod schema (`validParams`, `validBody`), and call one function
   in `server/utils`.
5. `server/utils/wordCards.ts` does the work: finds the line, asks the AI (`server/utils/ai/explainWord.ts`),
   saves the card (`createCard` in `server/utils/cards.ts`).
6. Anything that goes wrong is an `AppError` (`server/utils/errors.ts`) with a message key. It reaches the
   browser as JSON with the English message and the key, and the page shows the key's message in the reader's
   language (`app/utils/errors.ts`).

## Server

| Folder or file                                                                    | What it owns                                                                                                         |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `server/api/`                                                                     | Routes, one file per method and path. Thin, as above.                                                                |
| `server/db/schema.ts`                                                             | Every table, with a comment on what it's for. Changes go through `npm run db:generate`.                              |
| `server/utils/auth.ts`, `userAccess.ts`, `authOrigins.ts`                         | better-auth, the first account being admin, sign-up closing after it.                                                |
| `server/utils/settings.ts`                                                        | Instance settings: environment variable, else database, else nothing. Secrets encrypted (`secrets.ts`).              |
| `server/utils/media/`                                                             | Plex and Jellyfin behind one `MediaServer` interface.                                                                |
| `server/utils/subtitleSource.ts`, `opensubtitles.ts`                              | Getting a subtitle: media server, then OpenSubtitles with the person's account, or an upload.                        |
| `server/utils/lemmas/`                                                            | UDPipe: the model registry and downloads (`models.ts`), running it (`engine.ts`), the background queue (`index.ts`). |
| `server/utils/frequency.ts`, `knownWords.ts`, `transcript.ts`, `subtitleWords.ts` | Word ranks, what a learner knows, and turning a subtitle into words with states and "% you know".                    |
| `server/utils/ai/`                                                                | The two AI connectors and the two prompts: suggesting words, explaining one word.                                    |
| `server/utils/suggestions.ts`, `wordPicking.ts`, `cards.ts`, `reviews.ts`         | Suggestions, cards, the study queue, answers and undo.                                                               |
| `server/utils/notifications/`                                                     | Web push, ntfy, practice reminders, and "before you watch" from webhooks.                                            |
| `server/utils/jobs.ts`                                                            | Background work the browser polls (word suggestions), kept in the database.                                          |
| `server/plugins/`                                                                 | Start-up (finish interrupted jobs, resume lemmatising) and the reminder timer.                                       |

The server imports everything it uses (Nitro's auto-imports are off), so any name can be followed to its file.

## Browser

| Folder                    | What's there                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/pages/`              | One file per screen.                                                                                                                                                                                              |
| `app/components/`         | Pieces of screens. A component does one thing; `EpisodeView` puts the episode screen together from smaller ones.                                                                                                  |
| `app/composables/`        | State and behaviour shared by components: `useEpisodeWords` (an episode's words and what you do with them), `usePolling` (waiting on the server), `useFeedback` (a form's one-line result), `usePush`, `useAnki`. |
| `app/utils/`              | Plain functions and types: `api.ts` (requests and response types), `errors.ts`, `format.ts`, `icons.ts`.                                                                                                          |
| `app/assets/css/main.css` | Design tokens (light and dark) and the shared patterns: panels, buttons, fields, list boxes, pills, tabs. Components only add what's theirs.                                                                      |

## Shared

Code both sides need: languages (`languages.ts`), subtitle parsing (`subtitles.ts`), the spaced-repetition
scheduler (`srs.ts`), coverage tiers (`coverage.ts`), frequency bands, word keys, days, and the message
catalog reader the server uses (`messages.ts`).

## Text and translations

Every string a person sees is in `i18n/locales/en.json`, under a namespace per screen or concept. The
interface uses `$t()`/`t()` from @nuxtjs/i18n; the server uses the same file for error messages and
notifications (`shared/messages.ts`). Language names and number formats come from the browser's `Intl`, so
they need no translating. `test/messages.test.ts` fails if the code uses a key the catalog doesn't have.
See [the translating guide](https://learnarr.rushandhurry.us/wiki/translating.html).

## Background work

- **Lemmatising** runs one subtitle at a time in `server/utils/lemmas/index.ts`, downloading a language's model
  the first time. Its state is a `subtitle_lemmas` row; while there's none, `status()` says why.
- **Word suggestions** are a job (`jobs` table) the page polls.
- **Reminders** are checked every five minutes by `server/plugins/reminders.ts`.

All of it is in-process: a restart finishes interrupted jobs as failed and re-queues unanalysed subtitles.

## Tests

`npm test` runs vitest on the logic that matters: subtitle parsing, scheduling, lemma alignment and the real
UDPipe binary when it's installed, coverage, known words, the media server mappers, OpenSubtitles, AI
answers, notifications, the dictionary, reviews and undo, the origin check and the message catalog. Tests use
an in-memory database (`test/helpers.ts`) and fake `fetch` functions; nothing reaches the network.
