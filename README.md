<p align="center">
  <img src="website/logo.svg" alt="" width="96" height="96">
</p>

<h1 align="center">Learnarr</h1>

<p align="center">
  Learn a language from the shows and films already on your Plex or Jellyfin server.
</p>

<p align="center">
  <a href="https://learnarr.rushandhurry.us">Website</a> ·
  <a href="#install">Install</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

Learnarr is a self-hosted companion in the spirit of Sonarr and Radarr. Pick an episode you're about to
watch, and Learnarr reads its subtitles, works out how much of the dialogue you already understand, and
asks the AI provider you choose for the words worth learning. You go through the suggestions, keep the
ones you want, and study them as flashcards built around the real lines you'll hear. Study in the app on
your phone, or send the cards to Anki.

> **Status:** early (v0.2). It works end to end, and there will be rough edges.

## Features

- **Your library, your subtitles.** Browse Plex or Jellyfin and use the subtitle tracks you already have.
  When there are none, Learnarr downloads one from OpenSubtitles.com with each person's own free account.
- **"% you know" for every episode.** Learnarr finds each word's dictionary form and counts how much of the
  dialogue you already know, so you can pick shows at your level.
- **Words worth learning, not every word.** Your AI provider suggests words for your level. Learn them, mark
  the ones you already know, or skip them. Or tap any word in the transcript.
- **Real sentences.** Every card uses the line from the episode where the word came up.
- **Spaced repetition** that fits a phone, with undo. Push cards to Anki through AnkiConnect if you prefer.
- **Bring your own AI.** Anything OpenAI-compatible (OpenAI, Ollama, LM Studio, OpenRouter, Groq, Mistral,
  Gemini) or Anthropic's Claude. Run a local model and nothing leaves your network.
- **For the whole household.** The first account is the admin; everyone else gets their own account,
  languages and cards on the same server.

## Install

Learnarr runs as one Docker container with one `/config` folder. No environment variables are needed: the
setup wizard does the rest.

### Docker Compose

```yaml
services:
  learnarr:
    image: ghcr.io/jakubsz123/learnarr:latest
    container_name: learnarr
    ports:
      - "7979:7979"
    volumes:
      - ./config:/config
    environment:
      - PUID=1000
      - PGID=1000
    restart: unless-stopped
```

```bash
docker compose up -d
```

### Docker

```bash
docker run -d --name learnarr \
  -p 7979:7979 \
  -v ./config:/config \
  -e PUID=1000 -e PGID=1000 \
  --restart unless-stopped \
  ghcr.io/jakubsz123/learnarr:latest
```

Then open `http://<your-server>:7979`. The wizard creates the admin account, connects Plex or Jellyfin and
your AI provider, and asks which language you're learning.

Images are built for `linux/amd64` and `linux/arm64`.

### Updating

```bash
docker compose pull && docker compose up -d
```

Database changes are applied automatically when the container starts.

### Backups

Everything Learnarr keeps is in `/config`: the database, its encryption keys and downloaded language
models. Back up that folder. Without its `encryption.key`, saved passwords and API keys can't be read.

## Configuration

Everything can be set in the app. These environment variables are optional:

| Variable                                                 | What it does                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `PUID`, `PGID`                                           | The user and group that own `/config` (`id` on the host shows yours). Default `1000`.                           |
| `PUBLIC_URL`                                             | Learnarr's address behind an HTTPS reverse proxy, e.g. `https://learnarr.example.com`. Turns on secure cookies. |
| `MEDIA_SERVER`, `MEDIA_SERVER_URL`, `MEDIA_SERVER_TOKEN` | Pin the media server (`plex` or `jellyfin`) instead of setting it in the app.                                   |
| `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`   | Pin the AI provider (`openai-compatible` or `anthropic`).                                                       |
| `AUTH_SECRET`, `ENCRYPTION_KEY`                          | Use your own keys instead of the ones generated in `/config` on first start.                                    |

A setting pinned by an environment variable can't be changed in the app.

### AI providers

Word picking needs a model that follows instructions well. Cloud models (Claude, GPT, Gemini) work out of the
box. Local models of about 14B parameters and up work well; smaller ones pick odd words. Subtitle text is
sent only to the provider you set up.

### Languages

Learnarr works with any language your subtitles are in. "% you know" uses a lemmatiser model, available for
Czech, Danish, Dutch, English, French, German, Italian, Polish, Portuguese, Spanish and Swedish. Each model
downloads the first time someone learns that language. See [docs/languages.md](docs/languages.md).

### Anki

To push cards to Anki, install [AnkiConnect](https://ankiweb.net/shared/info/2055492159) and add Learnarr's
address to its `webCorsOriginList`. Then use **Send to Anki** on the Cards page.

## Development

```bash
npm install
scripts/fetch-udpipe.sh   # optional: the lemmatiser, for "% you know"
npm run dev               # http://localhost:3000
npm test
```

Nuxt 4, SQLite with Drizzle, better-auth. See [CONTRIBUTING.md](CONTRIBUTING.md) for how the code is
organised and what a pull request needs.

## Credits

Learnarr was written by Jakub Szura and Victor Buch; it grew out of Sub-Optimal, the language-learning app
they built together. See [AUTHORS](AUTHORS).

- Subtitles provided by [OpenSubtitles.com](https://www.opensubtitles.com).
- Lemmatisation by [UDPipe](https://github.com/ufal/udpipe), with models from LINDAT/CLARIAH-CZ.
- Word frequencies from Hermit Dave's [FrequencyWords](https://github.com/hermitdave/FrequencyWords).

Learnarr isn't affiliated with Sonarr, Radarr, Plex, Jellyfin or OpenSubtitles.

## License

[GPL-3.0](LICENSE)
