import type { Me } from "~/utils/api";

/** The signed-in user, loaded by the route middleware. */
export function useMe() {
  const me = useState<Me | null>("me", () => null);
  async function refresh() {
    me.value = await api<Me>("/api/me").catch(() => null);
  }
  return { me, refresh };
}
