# Contributing

Thanks for helping. A few conventions keep the code easy to read for the next person.

## Code

- Standard Nuxt layout: `app/` for the frontend, `server/` for the API, `shared/` for code both use.
- Small modules with plain names. If a file needs a table of contents, split it.
- Comments explain _why_, not _what_, and only when the code can't say it. No references to
  tickets, chats or documents a reader can't open.
- Validate every API input with zod. Errors go through `createError` with a clear message.
- Database changes go through Drizzle migrations (`npm run db:generate`). Never edit a migration that
  has been released.
- No new dependency without a reason in the PR description.

## Pull requests

- One change per PR, small enough to review in one sitting.
- Describe what changed and why, how you tested it, and what you didn't test.
- CI must pass: typecheck, lint, format check and tests.
- Commit messages: a short imperative summary line, then a body if the why isn't obvious.

## Running it

```bash
npm ci
npm run dev        # http://localhost:3000
npm test
```
