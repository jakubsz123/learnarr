# Learnarr

Learn a language from the shows and films already on your Plex or Jellyfin server.

Learnarr is a self-hosted companion in the spirit of Sonarr and Radarr. Pick an episode, and
Learnarr reads its subtitles, asks the AI provider you choose for the words worth learning, and
turns them into flashcards built around the real lines you heard. Study in the app or send the
cards to Anki.

> **Status:** v0.1, early. The core loop works; expect rough edges.

## Run it

```bash
git clone https://github.com/jakubsz123/learnarr && cd learnarr
docker compose up -d
```

Open `http://<your-server>:7979`. The setup wizard creates the admin account, connects Plex or
Jellyfin and your AI provider, and asks which language you're learning. Everything Learnarr keeps is
in `./config`; back that folder up. No environment variables are needed. If you put Learnarr behind
an HTTPS reverse proxy, set `PUBLIC_URL` to its address.

## How it works

- **Subtitles** come from your media server first, and from OpenSubtitles.com with your own free
  account when the server has none.
- **Words** are picked by your AI provider: anything OpenAI-compatible (OpenAI, Ollama, LM Studio,
  OpenRouter, Groq, Mistral, Gemini) or Anthropic. Subtitle text goes only to the provider you set up.
- **Everything stays on your server.** One container, one `/config` folder, no account with us.

## License

[GPL-3.0](LICENSE). See [AUTHORS](AUTHORS).
