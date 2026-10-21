import { z } from "zod";
import { AI_PROVIDERS } from "#shared/aiProviders";
import type { Settings } from "../settings";
import type { AiConfig } from "./client";

export const aiInput = z.object({
  provider: z.enum(AI_PROVIDERS),
  baseUrl: z.url({ protocol: /^https?$/ }).max(500),
  /** Omit to keep the stored key; empty to remove it. */
  apiKey: z.string().trim().max(500).optional(),
  model: z.string().trim().max(200).default(""),
});

export type AiInput = z.infer<typeof aiInput>;

/**
 * The connection to try or save. A stored key is reused only for the provider
 * and address it was saved with, so switching providers never sends one
 * provider's key to another.
 */
export function candidateConfig(input: AiInput, settings: Settings): AiConfig {
  const sameConnection =
    settings.get("ai.provider") === input.provider && settings.get("ai.baseUrl") === input.baseUrl;
  const apiKey =
    input.apiKey !== undefined ? input.apiKey || null : sameConnection ? settings.get("ai.apiKey") : null;
  return { provider: input.provider, baseUrl: input.baseUrl, apiKey, model: input.model };
}
