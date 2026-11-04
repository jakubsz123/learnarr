# Translating

Learnarr's interface is in English, and every word of it can be translated. You don't need to know any
programming; you need to know the language and have a GitHub account (or send us the file another way).

## How it works

All the text is in one file: [`i18n/locales/en.json`](https://github.com/jakubsz123/learnarr/blob/main/i18n/locales/en.json).
A translation is a copy of it with every message in your language. Language names ("Spanish", "español") and
numbers come from the browser, so they never need translating.

## Adding a language

1. Copy `i18n/locales/en.json` to `i18n/locales/<code>.json`, where `<code>` is the language's code: `pl`, `de`,
   `pt-BR`.
2. Translate the **values**, never the keys:

   ```json
   "signIn": {
     "title": "Zaloguj się",
     "noAccount": "Nie masz konta? Poproś osobę, która prowadzi ten serwer, żeby cię dodała."
   }
   ```

3. Add the language to `locales` in `nuxt.config.ts`:

   ```ts
   locales: [
     { code: "en", language: "en", name: "English", file: "en.json" },
     { code: "pl", language: "pl", name: "Polski", file: "pl.json" },
   ],
   ```

   and to `CATALOGS` in `shared/messages.ts`, so notifications and error messages are translated too.

4. Open a pull request. You can do all of this in GitHub's web editor.

A message you leave out falls back to English, so a translation can be finished bit by bit.

## Placeholders

Words in braces are filled in by Learnarr. Keep them exactly as they are, and move them where your language
needs them:

```json
"next": "Next: {episode} · {title}"
"next": "Dalej: {episode} · {title}"
```

`{language}` is always a language's name, already in the reader's language.

## Plurals

A message with forms separated by `|` changes with a number (`{count}`). Write one form for each plural
category your language has, in this order: **zero, one, two, few, many, other**, leaving out the ones it
doesn't use. Learnarr picks the form with the browser's own plural rules.

| Language                 | Categories            | Example                                                           |
| ------------------------ | --------------------- | ----------------------------------------------------------------- |
| English, German, Spanish | one, other            | `{count} card \| {count} cards`                                   |
| French                   | one, many, other      | `{count} carte \| {count} de cartes \| {count} cartes`            |
| Polish, Czech, Russian   | one, few, many, other | `{count} karta \| {count} karty \| {count} kart \| {count} karty` |
| Japanese, Chinese        | other                 | `{count} 枚`                                                      |

The [Unicode plural rules table](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)
lists every language's categories.

## Characters to avoid

`@`, `$`, `{` and `}` mean something to the translation library. Use braces only for placeholders. If you need
a literal `@`, write `{'@'}`.

## Checking your translation

```bash
npm ci
npm run dev
```

Pick your language in **Settings → Account → Interface language**, and go through the screens on a phone-sized
window: longer words can break a layout. `npm test` checks that the English file has every message the code
uses.
