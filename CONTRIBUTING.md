# Contributing

Thanks for helping. Learnarr is small enough to read in an afternoon; [docs/architecture.md](docs/architecture.md)
is the map. These conventions keep it that way.

## Getting started

```bash
nvm use                    # Node 24, from .nvmrc
npm ci
scripts/fetch-udpipe.sh    # the lemmatiser, for "% you know" (optional)
npm run dev                # http://localhost:3000
```

The first visit opens the setup wizard. To try it without a real Plex or Jellyfin, any Jellyfin in Docker
works (`docker run -p 8096:8096 jellyfin/jellyfin`), and so does a local Ollama for the AI.

Before you push:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
```

CI runs the same, then builds the Docker image and runs it.

## Code

- **Layout.** `app/` for the browser, `server/` for the API, `shared/` for code both use. Small modules with
  plain names; if a file needs a table of contents, split it.
- **Routes are thin.** A route checks who's asking (`requireUser`/`requireAdmin`), reads its input through a
  zod schema (`validParams`, `validQuery`, `validBody`, with `idParam` and `mediaIdParam` for ids), and then
  either runs one simple query or calls a function in `server/utils`. Anything with rules worth testing lives
  in `server/utils`, with its tests.
- **Errors** a person may see are `AppError`s with a key from `i18n/locales/en.json`
  (`throw new AppError(404, "errors.cards.notFound")`). Don't catch and re-map them in routes; h3 sends them.
- **Imports are explicit** on the server (auto-imports are off). In `app/`, Nuxt's auto-imports for
  composables, components and `app/utils` are fine.
- **Requests** from the browser go through `api<T>()` with the answer's type from `app/utils/api.ts`.
- **Text** the interface shows goes in `i18n/locales/en.json`, never in a template or script. Use a
  namespace per screen, `{placeholders}` for values, and `one | other` forms for counts. Language names come
  from `useLanguageNames()`, not the catalog.
- **Styles** use the tokens and shared classes in `app/assets/css/main.css`. Add to a component only what's
  its own. No inline styles, no colours outside the tokens.
- **Mobile first.** Most people use Learnarr on a phone. Nothing may only work on hover; tap targets are at
  least 44px (`var(--tap)`).
- **Comments** explain why, not what, and only when the code can't say it. No references to tickets, chats or
  documents a reader can't open.
- **Database changes** go through Drizzle migrations (`npm run db:generate`). Never edit a migration that has
  been released.
- **Dependencies:** none without a reason in the pull request. Learnarr has a handful and that's on purpose.

## Pull requests

- One change per pull request, small enough to review in one sitting.
- Say what changed and why, how you tested it, and what you didn't test.
- Commit messages: a short imperative summary line, then a body if the why isn't obvious.
- When you add a screen or a message, check it at phone width and in both themes.

## Translations, languages and docs

- Translating the interface: [website/wiki/translating.md](website/wiki/translating.md).
- Adding or checking a language's lemmatiser model: [docs/languages.md](docs/languages.md).
- The website and wiki are in `website/` (VitePress): `cd website && npm ci && npm run dev`.

## Reporting security problems

Please don't open a public issue; see [SECURITY.md](SECURITY.md).
