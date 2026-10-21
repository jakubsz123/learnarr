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
    opensubtitles: { connected: Boolean(user.opensubtitlesPassword), username: user.opensubtitlesUsername },
    anki: { url: user.ankiUrl ?? "http://127.0.0.1:8765", deck: user.ankiDeck ?? "Learnarr" },
  };
});
