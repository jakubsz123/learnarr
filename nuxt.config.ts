export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  devtools: { enabled: false },
  modules: ["@nuxtjs/i18n"],
  i18n: {
    // One URL per page whatever the language: Learnarr is an app behind a
    // login, not a site to index, so the language is a preference, not a path.
    strategy: "no_prefix",
    defaultLocale: "en",
    // To add a language: add its file to i18n/locales and a line here. See
    // website/wiki/translating.md.
    locales: [{ code: "en", language: "en", name: "English", file: "en.json" }],
    detectBrowserLanguage: { useCookie: true, cookieKey: "learnarr_locale", fallbackLocale: "en" },
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      title: "Learnarr",
      htmlAttrs: { lang: "en" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#15171c" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        {
          rel: "preload",
          href: "/fonts/roboto-latin.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
      ],
    },
  },
  typescript: { strict: true },
  // The server imports everything it uses, so a reader can follow any name to its file.
  nitro: { imports: false },
});
