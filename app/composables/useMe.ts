export interface Me {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  learningLanguage: string;
  nativeLanguage: string;
  level: "beginner" | "intermediate" | "advanced";
  opensubtitles: { connected: boolean; username: string | null };
  anki: { url: string; deck: string };
}

/** The signed-in user, loaded by the route middleware. */
export function useMe() {
  const me = useState<Me | null>("me", () => null);
  async function refresh() {
    me.value = await $fetch<Me>("/api/me").catch(() => null);
  }
  return { me, refresh };
}
