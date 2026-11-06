/**
 * A server with no accounts has one page, the setup wizard. Otherwise every page
 * but sign-in needs a session, admin pages need the admin, and someone signing
 * in for the first time answers a few questions first.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const requestFetch = useRequestFetch();
  const setupDone = useState<boolean>("setup-done", () => false);
  if (!setupDone.value) {
    const status = await requestFetch("/api/setup/status").catch(() => null);
    if (status?.needsAccount) return to.path === "/setup" ? undefined : navigateTo("/setup");
    setupDone.value = Boolean(status);
  }

  // An invite link is for someone who has no account (or forgot the password) yet.
  if (to.path.startsWith("/invite/")) return;

  const { me } = useMe();
  if (!me.value) me.value = await requestFetch("/api/me").catch(() => null);

  if (to.path === "/login") return me.value ? navigateTo("/") : undefined;
  if (!me.value) return navigateTo({ path: "/login", query: { redirect: to.fullPath } });
  if ((to.path === "/setup" || to.meta.admin) && !me.value.isAdmin) return navigateTo("/");
  if (!me.value.onboarded && to.path !== "/welcome" && to.path !== "/setup") return navigateTo("/welcome");
});
