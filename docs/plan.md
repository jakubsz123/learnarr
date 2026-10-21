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

## Later, maybe

Bazarr/Sonarr/Radarr, subtitle folders on disk, `.apkg` export, songs, books, notifications.

## Decisions

- Nuxt 4, SQLite with Drizzle, better-auth. Plain Vue components and our own CSS for the *arr
  look, light and dark.
- The first account is the admin; sign-up is closed after that, and the admin adds household members.
- Each user connects their own OpenSubtitles account. Learnarr's API key ships in the code.
- No YouTube, Whisper or browser extension.
- Ported code comes from `jakubsz123/learnarr-legacy`, the old Sub-Optimal fork, rewritten to this repo's style.
