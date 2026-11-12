# Changelog

## Unreleased

**Changed**

- Learnarr no longer ships an OpenSubtitles.com API key. Each person connects their own free account **and API
  key** in Settings → Account; searching and downloading use only theirs. An admin can still share one key
  with everyone through `OPENSUBTITLES_API_KEY`. **After updating, connect OpenSubtitles.com again** with a
  key, or search and downloads there stop working.

## 0.4.0 (2026-11-12)

**New**

- Use Learnarr without a media server: search OpenSubtitles.com's catalogue from the library, or upload a
  subtitle file of your own. The library shows which tabs are on your server and which are elsewhere.
- Invite links: the admin sends a link, and the person chooses their own username and password. The same kind
  of link resets a forgotten password. Change your own password under Settings → Account.
- Previous and next buttons on an episode page, to step through a show by hand, across seasons too.

**Changed**

- Learnarr now lives at github.com/smoothless-io/learnarr, and the image is ghcr.io/smoothless-io/learnarr.
  GitHub redirects the old repository address; the old image name gets no more updates.
- Sign in with a username, as on Radarr and Sonarr. Accounts made with an email can still sign in with it.
- The admin no longer makes up passwords for other people: Settings → Users creates invite links instead.
- Today shows only how to start until there is a card, instead of a row of zeros.
- The AI provider choice asks for the kind first (a cloud service, Anthropic, or your own computer), then the
  provider. Without a provider, an episode says so and points to Settings → AI.
- Plex servers are listed with their addresses, the likeliest first.
- Notification reminders are greyed out until a device or an ntfy topic is set up.
- The flashcard sentence is set larger in a serif, the word being learned has a tinted highlight, and the
  "% you know" rings are bigger.
- Users and Library fit a phone; the setup wizard's steps fit one row; the Settings icon is a gear.

**Fixed**

- A lost session sends you to sign in and back, instead of leaving "Sign in first." on screen.
- Northern Sami no longer shows as "se".
- The FAQ and docs said a media server was required.

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
