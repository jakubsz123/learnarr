# Privacy

Learnarr runs on your server and keeps everything in its `/config` folder. There's no account with us, no
analytics and no telemetry. The project never sees your data.

What leaves your server, and when:

| Goes to                          | What                                                          | When                                                                       |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Your AI provider                 | An episode's subtitle text, or one line                       | When you ask for suggestions, or make a card from a tapped word            |
| OpenSubtitles.com                | The film or episode's title and IDs, your OpenSubtitles login | When the media server has no subtitle and you ask Learnarr to download one |
| Wiktionary                       | The word you tapped                                           | When you tap a word and open its definition                                |
| lindat.mff.cuni.cz               | Nothing about you: a model file is downloaded                 | Once per language                                                          |
| Your push service or ntfy server | The notification text                                         | When you've set up [notifications](./notifications)                        |

With a local AI model (Ollama, LM Studio), subtitle text never leaves your network.

Passwords are hashed. The media server token, AI key and OpenSubtitles passwords are encrypted at rest with a
key generated in `/config/encryption.key`. Keep that file with your backups: without it, those secrets can't
be read and have to be entered again.

Subtitles are stored per person and never shared, even inside the household, because a file downloaded with
one person's OpenSubtitles.com account is licensed to them. Learnarr never serves subtitle text to anyone but
the person who fetched it.
