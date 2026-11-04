import { defineEventHandler } from "h3";
import { aiInput, candidateConfig } from "~~/server/utils/ai/input";
import { requireAdmin } from "~~/server/utils/auth";
import { AppError } from "~~/server/utils/errors";
import { useSettings } from "~~/server/utils/settings";
import { validBody } from "~~/server/utils/validate";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  if (settings.isPinned("ai")) throw new AppError(409, "errors.ai.fromEnv");
  const input = await validBody(event, aiInput);
  if (!input.model) throw new AppError(400, "errors.ai.pickModel");
  const config = candidateConfig(input, settings);
  settings.set("ai.provider", config.provider);
  settings.set("ai.baseUrl", config.baseUrl);
  settings.set("ai.apiKey", config.apiKey);
  settings.set("ai.model", config.model);
  return { saved: true };
});
