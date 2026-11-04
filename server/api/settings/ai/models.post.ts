import { defineEventHandler } from "h3";
import { listModels } from "~~/server/utils/ai/client";
import { aiInput, candidateConfig } from "~~/server/utils/ai/input";
import { requireAdmin } from "~~/server/utils/auth";
import { useSettings } from "~~/server/utils/settings";
import { validBody } from "~~/server/utils/validate";

/** The models a provider offers, to pick from. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const config = candidateConfig(await validBody(event, aiInput), useSettings());
  return { models: await listModels(config) };
});
