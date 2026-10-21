export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = useSettings();
  for (const key of ["media.kind", "media.url", "media.token", "media.name"] as const)
    settings.set(key, null);
  return { removed: true };
});
