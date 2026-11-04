# Learnarr's website

The landing page (`public/index.html`, plain HTML and CSS) and the wiki (`wiki/*.md`, built with
[VitePress](https://vitepress.dev)).

```bash
npm ci
npm run dev      # http://localhost:5173/wiki/
npm run build    # into .vitepress/dist, ready for any static host
```

The landing page is copied as it is to the root of the build; the wiki is under `/wiki/`. The languages table
(`wiki/languages.md`) is generated from the app's own source at build time
(`.vitepress/theme/languages.data.ts`).

Support links (Buy Me a Coffee, GitHub Sponsors) are set in `.vitepress/config.ts` under
`themeConfig.support`; an empty address hides its button.
