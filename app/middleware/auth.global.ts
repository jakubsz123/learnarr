interface SetupStatus {
  needsAccount: boolean;
  mediaServer: boolean;
  ai: boolean;
}

/**
 * A server with no accounts has one page, the setup wizard. Otherwise every page
 * but sign-in needs a session, and admin pages need the admin.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const requestFetch = useRequestFetch();
  const setupDone = useState<boolean>("setup-done", () => false);
  if (!setupDone.value) {
    const status = await requestFetch<SetupStatus>("/api/setup/status").catch(() => null);
    if (status?.needsAccount) return to.path === "/setup" ? undefined : navigateTo("/setup");
    setupDone.value = Boolean(status);
  }

  const { me } = useMe();
  if (!me.value) me.value = await requestFetch<Me>("/api/me").catch(() => null);

  if (to.path === "/login") return me.value ? navigateTo("/library") : undefined;
  if (!me.value) return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  if ((to.path === "/setup" || to.meta.admin) && !me.value.isAdmin) return navigateTo("/library");
});
