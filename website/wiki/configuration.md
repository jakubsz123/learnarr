# Configuration

Everything can be set in the app; no environment variables are needed. These are optional, for people who
like their configuration in the compose file. A setting pinned by an environment variable shows as such and
can't be changed in the app.

| Variable                                 | Default              | What it does                                                                                    |
| ---------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| `PUID`, `PGID`                           | `1000`               | The user and group that own `/config`.                                                          |
| `TZ`                                     | `UTC`                | Time zone for "today", streaks and reminders.                                                   |
| `PORT`                                   | `7979`               | The port inside the container.                                                                  |
| `PUBLIC_URL`                             |                      | Learnarr's address behind an HTTPS reverse proxy. Turns on secure cookies.                      |
| `TRUSTED_ORIGINS`                        |                      | Extra addresses Learnarr is reached at, comma-separated, if sign-in fails with an origin error. |
| `MEDIA_SERVER`                           |                      | `plex` or `jellyfin`.                                                                           |
| `MEDIA_SERVER_URL`, `MEDIA_SERVER_TOKEN` |                      | The media server's address and token or API key.                                                |
| `AI_PROVIDER`                            |                      | `openai-compatible` or `anthropic`.                                                             |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`  |                      | The AI provider's address, key and model.                                                       |
| `OPENSUBTITLES_API_KEY`                  | unset                | An OpenSubtitles.com API key shared with everyone here who hasn't added their own.              |
| `AUTH_SECRET`                            | generated            | The secret that signs sessions. Generated into `/config/auth.key` if unset.                     |
| `ENCRYPTION_KEY`                         | generated            | The key secrets are encrypted with. Generated into `/config/encryption.key` if unset.           |
| `UDPIPE_BIN`                             | `/opt/udpipe/udpipe` | Where the lemmatiser binary is.                                                                 |
| `NTFY_URL`, `NTFY_TOKEN`                 | `https://ntfy.sh`    | The ntfy server for [notifications](./notifications), and an access token for it.               |
| `REMINDER_HOUR`                          | `18`                 | The hour (in `TZ`) practice reminders are sent.                                                 |

## The `/config` folder

| File                         | What it is                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `learnarr.db`                | The database: accounts, settings, subtitles, cards.                          |
| `auth.key`, `encryption.key` | Generated keys. Back them up with the database.                              |
| `push.json`                  | The keys for web push notifications.                                         |
| `udpipe/models/`             | Downloaded language models. Safe to delete; they download again when needed. |
