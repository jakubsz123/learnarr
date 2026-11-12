# Subtitles

Everything in Learnarr starts from an episode's subtitle in the language you're learning. When you open an
episode and press **Get subtitle**, Learnarr looks in three places, in order:

1. **Your media server.** Plex and Jellyfin both list the subtitle tracks of a file. Learnarr takes a text
   track in your language: an external `.srt`/`.ass` file next to the video first, then one inside the file.
   Forced tracks (only the foreign-language parts) and image-based tracks (PGS, VobSub) can't be used. Tracks
   with descriptions for the deaf and hard of hearing are used last, and the descriptions (`[door creaks]`)
   are left out.
2. **OpenSubtitles.com**, with your own free account, if the media server has nothing. Each person connects
   their account in **Settings → Account**. A free account allows a limited number of downloads a day, so
   Learnarr downloads only when you ask, and stops at the first file that works.
3. **A file you upload**, with **Upload a file** on the episode, if neither has one. **Use another subtitle
   file** replaces one you already have, keeping your cards from it. `.srt`, `.vtt` and
   `.ass` all work.

A subtitle belongs to the person who fetched it. If two people in the household learn from the same episode,
each gets their own copy, because a file downloaded with one person's OpenSubtitles account is theirs.

## The OpenSubtitles.com API key

OpenSubtitles.com asks every app that uses it to identify itself with an API key, so each Learnarr server has
its own. It's free: log in at [opensubtitles.com/consumers](https://www.opensubtitles.com/en/consumers), add
a new consumer (name it Learnarr), and paste its API key in **Settings → Media server** (or in the setup
wizard). Without it, Learnarr can't search OpenSubtitles.com for films, shows or subtitles; your media server
and uploaded files still work.

The key only identifies the server. Downloads are always made with each person's own OpenSubtitles.com
account, on their own daily allowance.

## Getting better subtitles

Subtitles that match the audio closely make better cards. If you use **Bazarr**, set it to fetch subtitles
in the language you're learning, and Learnarr will find them on your media server. For films dubbed into your
target language, choose the subtitle that matches the dub, not the original script.
