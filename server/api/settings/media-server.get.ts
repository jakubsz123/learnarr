export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  return {
    kind: settings.get("media.kind"),
    url: settings.get("media.url"),
    name: settings.get("media.name"),
    hasToken: Boolean(settings.get("media.token")),
    fromEnv:
      settings.isFromEnv("media.kind") ||
      settings.isFromEnv("media.url") ||
      settings.isFromEnv("media.token"),
  };
});
