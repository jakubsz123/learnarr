/**
 * Two connectors cover every provider: the OpenAI chat API at any address (OpenAI
 * itself, Ollama, LM Studio, OpenRouter, Groq, Mistral, Google Gemini) and
 * Anthropic's own API. A preset is a starting address and model for one of them.
 */
export const AI_PROVIDERS = ["openai-compatible", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export interface AiPreset {
  id: string;
  label: string;
  provider: AiProvider;
  baseUrl: string;
  needsKey: boolean;
  model: string;
  /** Runs on your own hardware: nothing leaves the network, and small models pick worse words. */
  local: boolean;
}

export const AI_PRESETS: readonly AiPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
    model: "gpt-4o-mini",
    local: false,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    needsKey: true,
    model: "claude-sonnet-5-5",
    local: false,
  },
  {
    id: "ollama",
    label: "Ollama",
    provider: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    needsKey: false,
    model: "qwen3:14b",
    local: true,
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    provider: "openai-compatible",
    baseUrl: "http://localhost:1234/v1",
    needsKey: false,
    model: "",
    local: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    provider: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    model: "",
    local: false,
  },
  {
    id: "groq",
    label: "Groq",
    provider: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    needsKey: true,
    model: "",
    local: false,
  },
  {
    id: "mistral",
    label: "Mistral",
    provider: "openai-compatible",
    baseUrl: "https://api.mistral.ai/v1",
    needsKey: true,
    model: "mistral-small-latest",
    local: false,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    provider: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    needsKey: true,
    model: "gemini-2.5-flash",
    local: false,
  },
];
