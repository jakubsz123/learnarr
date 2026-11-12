import { defineEventHandler } from "h3";
import { ANKI_DEFAULTS } from "#shared/anki";
import { resolveAiConfig } from "~~/server/utils/ai/config";
import { requireUser } from "~~/server/utils/auth";
import { openSubtitlesApiKey, sharedApiKey } from "~~/server/utils/opensubtitles";
import { useSettings } from "~~/server/utils/settings";

/** The signed-in person: who they are, what they learn, and their connections. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    learningLanguage: user.learningLanguage,
    nativeLanguage: user.nativeLanguage,
    level: user.level,
    onboarded: user.onboardedAt !== null,
    /** Whether an AI provider is set up, since suggesting words needs one. */
    aiConfigured: resolveAiConfig(useSettings()) !== null,
    opensubtitles: {
      /** Connected with both an account and an API key: what searching and downloading need. */
      connected: Boolean(user.opensubtitlesPassword) && openSubtitlesApiKey(user) !== null,
      username: user.opensubtitlesUsername,
      /** Whether the admin shares an API key, so the person needn't bring one. */
      sharedKey: sharedApiKey() !== null,
    },
    anki: { url: user.ankiUrl ?? ANKI_DEFAULTS.url, deck: user.ankiDeck ?? ANKI_DEFAULTS.deck },
  };
});
