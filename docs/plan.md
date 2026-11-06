# Plan

## v0.1: the core loop

1. Setup wizard: admin account, then Plex or Jellyfin, then AI provider, then language.
2. Browse the media server's library and pick an episode or film.
3. Get its subtitle: the media server's track first, then OpenSubtitles with the user's own account.
4. The AI picks the words worth learning. Each card's example sentence is the real subtitle line.
5. Study with spaced-repetition flashcards. Push cards to Anki through AnkiConnect.
6. Settings: users, AI, media server, OpenSubtitles account. System: status.

Ships as one Docker image with a `/config` volume and runs with no environment variables.

## v0.2

- Lemmatisation with UDPipe and a "% you know" score per episode. Models download on demand.
- Frequency lists.
- A Today page, show and episode browsing, a transcript you can tap words in, and undo in study.

## v0.3

- Lemmatisation for every language with a UDPipe model (52), frequency lists for 50.
- Notifications: web push and ntfy, practice reminders, "before you watch" from Plex and Jellyfin plays.
- Wiktionary definitions, subtitle upload, Anki export, streak and activity on Today.
- A translatable interface, a first-sign-in step for household members, and a wiki on the website.

## Next

- Follow along live: the current line on your phone while Plex or Jellyfin plays.
- A library view sorted by "% you know", to find what you can watch.
- Translate a whole line with the AI.
- Decks per show; minutes watched and per-show progress.

## Later, maybe

Bazarr/Sonarr/Radarr, subtitle folders on disk, embedded tracks through ffmpeg, `.apkg` export, songs, books.

## Decisions

- Nuxt 4, SQLite with Drizzle, better-auth. Plain Vue components and our own CSS for the *arr
  look, light and dark.
- The first account is the admin; sign-up is closed after that, and the admin adds household members.
- Each user connects their own OpenSubtitles account. Learnarr's API key ships in the code.
- No YouTube, Whisper or browser extension.
- Ported code comes from `jakubsz123/learnarr-legacy`, the first attempt, rewritten to this repo's style.
- Notifications need no third-party account: web push signs with keys made on the server, and ntfy can be
  self-hosted.
- The interface is translated with @nuxtjs/i18n; the server sends message keys with its errors, so one
  catalog serves both. English first; other languages come from contributors.
