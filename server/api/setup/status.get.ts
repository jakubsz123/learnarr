import { useDb } from "../../db";
import { countUsers } from "../../utils/userAccess";

/** Public: tells the app whether to show the setup wizard. Booleans only. */
export default defineEventHandler(() => {
  const settings = useSettings();
  return {
    needsAccount: countUsers(useDb()) === 0,
    mediaServer: Boolean(
      settings.get("media.kind") && settings.get("media.url") && settings.get("media.token"),
    ),
    ai: Boolean(settings.get("ai.provider") && settings.get("ai.model")),
  };
});
