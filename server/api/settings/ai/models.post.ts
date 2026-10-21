import { AiError, listModels } from "~~/server/utils/ai/client";
import { aiInput, candidateConfig } from "~~/server/utils/ai/input";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const config = candidateConfig(await validBody(event, aiInput), useSettings());
  try {
    return { models: await listModels(config) };
  } catch (error) {
    if (error instanceof AiError) return { models: [], error: error.message };
    throw error;
  }
});
