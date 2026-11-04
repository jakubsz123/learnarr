import { defineEventHandler } from "h3";
import { useDb } from "~~/server/db";
import { resolveAiConfig } from "~~/server/utils/ai/config";
import { mediaServerSettings } from "~~/server/utils/media";
import { useSettings } from "~~/server/utils/settings";
import { countUsers } from "~~/server/utils/userAccess";

/** Public: tells the app whether to show the setup wizard. Booleans only. */
export default defineEventHandler(() => {
  const settings = useSettings();
  return {
    needsAccount: countUsers(useDb()) === 0,
    mediaServer: mediaServerSettings(settings) !== null,
    ai: resolveAiConfig(settings) !== null,
  };
});
