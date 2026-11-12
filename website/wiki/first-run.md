# First run

The first time you open Learnarr, a setup wizard asks four things. You can change all of them later in
**Settings**.

## 1. Your account

The first account on a server is its **admin**. After it exists, sign-up is closed: the admin adds everyone
else in **Settings → Users** (see [Household accounts](./household)).

## 2. Your media server

Pick Plex or Jellyfin, or press **Skip for now**: without a media server you can still search
OpenSubtitles.com for any film or show and upload subtitle files of your own. Connecting one later is
**Settings → Media server**.

The same step asks for an OpenSubtitles.com API key, which searching OpenSubtitles.com needs. It's free; see
[The OpenSubtitles.com API key](subtitles.html#the-opensubtitles-com-api-key). You can add it later in
**Settings → Media server**.

- **Plex:** choose _Sign in with Plex_ and approve Learnarr on plex.tv; Learnarr then lists your servers and
  you pick one. Or paste the server address and an
  [X-Plex-Token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/).
- **Jellyfin:** enter the server address (for example `http://192.168.1.10:8096`) and an API key from
  _Dashboard → API Keys_.

Learnarr only reads from your server: it browses libraries, reads subtitle tracks and shows posters. It never
changes anything there.

## 3. Your AI provider

Learnarr asks an AI model to suggest the words worth learning in an episode, and to translate a word you tap.
Pick a provider, paste a key, choose a model and press **Test**: Learnarr picks words from a short Spanish
sample so you can see what you'll get and how long it takes. [AI providers](./ai-providers) compares the
options, including free and local ones.

## 4. Your languages

- **I'm learning:** the language of the subtitles you'll study.
- **Translate into:** the language translations and notes are written in.
- **Level:** beginner, intermediate or advanced. This decides which words are suggested, and how many common
  words count as known before you've marked any (see ["% you know"](./coverage)).

That's it. Open the **Library**, pick something, and read [Episodes and words](./episodes).
