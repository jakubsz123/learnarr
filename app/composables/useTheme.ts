export type ThemeChoice = "system" | "light" | "dark";

/** Light, dark or the system's choice; kept in a cookie so the server renders the right one. */
export function useTheme() {
  const choice = useCookie<ThemeChoice>("theme", {
    default: () => "system",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  useHead({
    htmlAttrs: { "data-theme": computed(() => (choice.value === "system" ? undefined : choice.value)) },
  });
  function cycle() {
    choice.value = choice.value === "system" ? "dark" : choice.value === "dark" ? "light" : "system";
  }
  return { choice, cycle };
}
