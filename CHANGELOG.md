# Changelog

## Unreleased

**New**

- Invite links: the admin sends a link, and the person chooses their own name, email and password. The
  same kind of link resets a forgotten password.
- Change your own password under Settings → Account.
- Sign in with a username instead of an email, as on Radarr and Sonarr (older accounts can still use their email).
- Plex servers are listed with their addresses, the likeliest first; the Settings icon is now a gear.
- Notification reminders are greyed out until a device or an ntfy topic is set up.
- Today shows only how to start until there is a card, instead of a row of zeros.
- Previous and next buttons on an episode page, to step through a show by hand (across seasons too).
- The FAQ and docs now say a media server is optional: OpenSubtitles.com search and uploads work without one.
- Browse OpenSubtitles.com's catalogue in the library without a media server, and upload a subtitle of your
  own. The library shows which tabs are on your server and which are elsewhere.

**Changed**

- The admin no longer makes up passwords for other people: Settings → Users creates invite links instead.
- Without an AI provider, an episode says so and points to Settings → AI, instead of a button that fails.
- The AI provider choices fit two to a row on a phone.

## 0.3.0

**New**

- "% you know" for 52 languages. Every UDPipe model from the Universal Dependencies 2.5 release is pinned by
  checksum and downloads the first time someone learns that language. Frequency lists for 50 languages.
- Notifications, by web push (installable on a phone's home screen) or ntfy: a daily reminder when cards are
  waiting, and "before you watch" with an episode's words when you press play on Plex or Jellyfin.
- Tap a word for its Wiktionary definitions, following plurals and conjugations to the base word.
- Upload a subtitle file for an episode.
- Export cards as a file Anki imports.
- Today shows your longest streak and twelve weeks of activity.
- Household members answer a few questions (languages, level) when they first sign in.
- The interface can be translated: every string is in one catalog, and language names come from the browser.
- A wiki on the website: install, setup, the method behind Learnarr, and running a server.

**Fixed**

- Another web app on the same server could send requests to Learnarr with your session. Writes from another
  site are now refused.
- Opening a media item that doesn't exist gave a server error instead of "not found".
- Tapping "Get subtitle" or making a card twice at once could fail.
- "Today" (new-card limit, streak) followed UTC instead of the server's time zone. Set `TZ`.
- A sign-in form submitted before the page finished loading could put the password in the address.

## 0.2.0

- "% you know" per episode, with UDPipe lemmas for 11 languages, and frequency lists.
- Known words, seeded for your level; mark words known in an episode's word list or transcript.
- Today, show pages with seasons, and an episode page with suggested words, the transcript and its cards.
- AI suggestions you learn, mark known or skip, instead of cards made straight away.
- Undo and editing translations while studying.
- A published multi-arch Docker image.

## 0.1.0

- First release: Plex and Jellyfin, subtitles from the media server or OpenSubtitles.com, AI word picking,
  spaced-repetition study, AnkiConnect, household accounts, one Docker container.
