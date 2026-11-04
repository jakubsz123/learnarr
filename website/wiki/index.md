# What Learnarr is

Learnarr helps you learn a language from the films and series you already have on your Plex or Jellyfin
server. It is a self-hosted app in the spirit of Sonarr and Radarr: one container on your own machine, an
account for everyone in the household, and nothing stored anywhere else.

The idea is simple. You learn the words of what you're about to watch, so that when you watch it you can
follow it. Learnarr does the tedious part:

1. It **reads the subtitle** of an episode, from your media server or, if there is none, from
   OpenSubtitles.com with your own free account.
2. It **works out how much of the dialogue you already understand**, as a percentage, by matching every word
   to its dictionary form and checking it against the words you know.
3. It **suggests the words worth learning** at your level, using an AI model you choose, with the real line
   from the episode for each one.
4. You **study them as flashcards** with spaced repetition, on your phone or in Anki.

Then you watch the episode, and you understand more of it than you would have.

## Who it's for

- You already have a media server, or are happy to run a Docker container.
- You're past the very first steps of a language (you know a few hundred words), and want to move on to real
  films and series.
- You'd like to learn from what you actually enjoy watching, not from a textbook's dialogues.

It isn't a course: there are no grammar lessons. Many people use it alongside one.

## Where to go next

- [Install](./install) Learnarr, then go through the [first run](./first-run).
- Read [the method](./method) to see why it works the way it does.
- [A day with Learnarr](./daily) shows how the pieces fit in practice.
