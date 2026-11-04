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
3. **A file you upload**, in **Upload a subtitle** on the episode, if neither has one. `.srt`, `.vtt` and
   `.ass` all work.

A subtitle belongs to the person who fetched it. If two people in the household learn from the same episode,
each gets their own copy, because a file downloaded with one person's OpenSubtitles account is theirs.

## Getting better subtitles

Subtitles that match the audio closely make better cards. If you use **Bazarr**, set it to fetch subtitles
in the language you're learning, and Learnarr will find them on your media server. For films dubbed into your
target language, choose the subtitle that matches the dub, not the original script.
