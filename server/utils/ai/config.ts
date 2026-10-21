import { AI_PROVIDERS, type AiProvider } from "#shared/aiProviders";
import type { Settings } from "../settings";
import type { AiConfig } from "./client";

/** The household's AI provider, or null until one is set up. */
export function resolveAiConfig(settings: Settings): AiConfig | null {
  const provider = settings.get("ai.provider");
  const baseUrl = settings.get("ai.baseUrl");
  const model = settings.get("ai.model");
  if (!provider || !(AI_PROVIDERS as readonly string[]).includes(provider) || !baseUrl || !model) return null;
  return { provider: provider as AiProvider, baseUrl, model, apiKey: settings.get("ai.apiKey") };
}
