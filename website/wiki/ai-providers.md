# AI providers

Learnarr uses an AI model for two things: suggesting the words worth learning in an episode, and translating
a word you tap, as it's used in that line. Everything else (the transcript, "% you know", studying) works
without one.

It talks to two kinds of API, which between them cover nearly every provider:

- the **OpenAI chat API**, which OpenAI, Ollama, LM Studio, OpenRouter, Groq, Mistral and Google Gemini all
  offer;
- **Anthropic's API**, for Claude.

The admin sets the provider once, in **Settings → AI**, and everyone in the household uses it.

## Which to choose

| Provider                           | Cost                     | Quality         | Notes                                               |
| ---------------------------------- | ------------------------ | --------------- | --------------------------------------------------- |
| OpenAI (`gpt-4o-mini` or newer)    | about a cent per episode | very good       | the easiest start                                   |
| Anthropic (Claude Sonnet or Haiku) | a few cents per episode  | very good       | strong on idioms and notes                          |
| Google Gemini                      | free tier available      | good            | use the OpenAI-compatible address Learnarr fills in |
| OpenRouter                         | depends on the model     | depends         | one key for hundreds of models                      |
| Groq, Mistral                      | free tiers available     | good            | fast                                                |
| Ollama, LM Studio (local)          | free                     | depends on size | nothing leaves your network                         |

Suggesting words for an episode sends its whole subtitle (about 6,000 words for a 45-minute episode) and gets
back a few dozen words, so even paid models cost very little. Translating a tapped word sends one line.

## Local models

With [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai), no text leaves your network. Learnarr
needs a model that follows instructions and answers in JSON:

- **14B parameters or more** works well (for example `qwen3:14b`, `gemma3:27b`, `mistral-small`).
- **7–8B** works but picks odder words and translates less reliably, especially for smaller languages.
- Under that, results are poor.

Reasoning ("thinking") models work but are slow, because they think before answering. If a model keeps
running out of room, pick one that isn't a reasoning model.

When Learnarr runs in Docker and Ollama runs on the same machine, `localhost` inside the container is the
container itself. Use the host's address instead, for example `http://192.168.1.10:11434/v1`, or
`http://host.docker.internal:11434/v1` with
`extra_hosts: ["host.docker.internal:host-gateway"]` in your compose file.

## Testing

**Test** in Settings → AI picks words from a short Spanish sample and shows you the words and how long it took.
If it fails, the message says why: a wrong key, a model name the provider doesn't know, or an answer that
wasn't the JSON Learnarr asked for (usually a model that is too small).

## Pinning the provider

To set the provider by environment variables instead of in the app (it then can't be changed there):

```yaml
environment:
  - AI_PROVIDER=openai-compatible # or anthropic
  - AI_BASE_URL=https://api.openai.com/v1
  - AI_API_KEY=sk-...
  - AI_MODEL=gpt-4o-mini
```
