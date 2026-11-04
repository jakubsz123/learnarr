import { defineConfig } from "vitepress";

// Where the site is served from: "/" on its own domain, "/learnarr/" on GitHub Pages.
const base = process.env.SITE_BASE ?? "/";

export default defineConfig({
  base,
  title: "Learnarr",
  description: "Learn a language from the shows and films on your Plex or Jellyfin server.",
  cleanUrls: true,
  lastUpdated: true,
  appearance: "dark",
  head: [
    ["link", { rel: "icon", href: `${base}logo.svg`, type: "image/svg+xml" }],
    ["meta", { name: "theme-color", content: "#0f1114" }],
  ],
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/", target: "_self" },
      { text: "Guide", link: "/wiki/install" },
      { text: "How it works", link: "/wiki/method" },
      { text: "Support", link: "/wiki/support" },
    ],
    sidebar: {
      "/wiki/": [
        {
          text: "Getting started",
          items: [
            { text: "What Learnarr is", link: "/wiki/" },
            { text: "Install", link: "/wiki/install" },
            { text: "First run", link: "/wiki/first-run" },
            { text: "AI providers", link: "/wiki/ai-providers" },
            { text: "Subtitles", link: "/wiki/subtitles" },
          ],
        },
        {
          text: "Using it",
          items: [
            { text: "A day with Learnarr", link: "/wiki/daily" },
            { text: "Episodes and words", link: "/wiki/episodes" },
            { text: "Studying", link: "/wiki/studying" },
            { text: "Anki", link: "/wiki/anki" },
            { text: "Notifications", link: "/wiki/notifications" },
            { text: "Household accounts", link: "/wiki/household" },
          ],
        },
        {
          text: "How it works",
          items: [
            { text: "The method", link: "/wiki/method" },
            { text: '"% you know"', link: "/wiki/coverage" },
            { text: "Languages", link: "/wiki/languages" },
            { text: "Privacy", link: "/wiki/privacy" },
          ],
        },
        {
          text: "Running a server",
          items: [
            { text: "Configuration", link: "/wiki/configuration" },
            { text: "Updates and backups", link: "/wiki/updates" },
            { text: "Troubleshooting", link: "/wiki/troubleshooting" },
          ],
        },
        {
          text: "Project",
          items: [
            { text: "Contributing", link: "/wiki/contributing" },
            { text: "Translating", link: "/wiki/translating" },
            { text: "Support Learnarr", link: "/wiki/support" },
          ],
        },
      ],
    },
    // Donation pages for wiki/support.md; an empty address hides its button.
    support: {
      coffee: "",
      github: "",
    },
    socialLinks: [{ icon: "github", link: "https://github.com/jakubsz123/learnarr" }],
    editLink: {
      pattern: "https://github.com/jakubsz123/learnarr/edit/main/website/:path",
      text: "Edit this page on GitHub",
    },
    search: { provider: "local" },
    footer: {
      message:
        "Free software under the GPL-3.0. Not affiliated with Sonarr, Radarr, Plex, Jellyfin or OpenSubtitles.",
    },
  },
});
