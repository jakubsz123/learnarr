import { LANGUAGES } from "#shared/languages";

/**
 * Language names in the reader's own language ("espagnol" for a French
 * reader), from the browser's Intl data, so no translation file needs them.
 */
export function useLanguageNames() {
  const { locale } = useI18n();
  const names = computed(() => {
    try {
      return new Intl.DisplayNames([locale.value], { type: "language", fallback: "none" });
    } catch {
      return null;
    }
  });
  function languageName(code: string): string {
    return names.value?.of(code) ?? LANGUAGES.find((l) => l.code === code)?.name ?? code;
  }
  /** Every language Learnarr offers, sorted by name in the reader's language. */
  const languageOptions = computed(() =>
    LANGUAGES.map((l) => ({ code: l.code, name: languageName(l.code) })).toSorted((a, b) =>
      a.name.localeCompare(b.name, locale.value),
    ),
  );
  return { languageName, languageOptions };
}
