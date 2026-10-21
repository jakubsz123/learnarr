import { AI_PRESETS } from "#shared/aiProviders";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  return {
    provider: settings.get("ai.provider"),
    baseUrl: settings.get("ai.baseUrl"),
    model: settings.get("ai.model"),
    hasApiKey: Boolean(settings.get("ai.apiKey")),
    fromEnv: (["ai.provider", "ai.baseUrl", "ai.apiKey", "ai.model"] as const).some((k) =>
      settings.isFromEnv(k),
    ),
    presets: AI_PRESETS,
  };
});
