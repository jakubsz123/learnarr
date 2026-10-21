import { aiInput, candidateConfig } from "~~/server/utils/ai/input";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  if ((["ai.provider", "ai.baseUrl", "ai.apiKey", "ai.model"] as const).some((k) => settings.isFromEnv(k))) {
    throw createError({
      statusCode: 409,
      statusMessage: "The AI provider is set by environment variables on this server.",
    });
  }
  const input = await validBody(event, aiInput);
  if (!input.model) throw createError({ statusCode: 400, statusMessage: "Pick a model." });
  const config = candidateConfig(input, settings);
  settings.set("ai.provider", config.provider);
  settings.set("ai.baseUrl", config.baseUrl);
  settings.set("ai.apiKey", config.apiKey);
  settings.set("ai.model", config.model);
  return { saved: true };
});
