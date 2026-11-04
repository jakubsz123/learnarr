# Contributing

Learnarr is open source (GPL-3.0) and welcomes help of every kind.

- **Code:** start with [CONTRIBUTING.md](https://github.com/jakubsz123/learnarr/blob/main/CONTRIBUTING.md) and
  the map of the code in
  [docs/architecture.md](https://github.com/jakubsz123/learnarr/blob/main/docs/architecture.md).
- **Translations:** see [Translating](./translating).
- **Languages:** check how Learnarr handles a language you speak, and
  [report what looks wrong](https://github.com/jakubsz123/learnarr/issues/new?template=language.yml).
- **This wiki:** every page has an _Edit this page_ link at the bottom. The pages are Markdown files in
  `website/wiki`.
- **Bugs and ideas:** [GitHub issues](https://github.com/jakubsz123/learnarr/issues).

## Running it locally

```bash
git clone https://github.com/jakubsz123/learnarr && cd learnarr
nvm use && npm ci
scripts/fetch-udpipe.sh   # optional: the lemmatiser
npm run dev               # http://localhost:3000
```

The wiki:

```bash
cd website && npm ci && npm run dev
```

## What's planned

[docs/plan.md](https://github.com/jakubsz123/learnarr/blob/main/docs/plan.md) has what's next, and
[docs/comparison.md](https://github.com/jakubsz123/learnarr/blob/main/docs/comparison.md) compares Learnarr with
Sub-Optimal, the app it grew out of.
