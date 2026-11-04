/**
 * Plurals for every language from the browser's own plural rules, so a
 * translation needs no code: write a message's forms separated by `|`, in the
 * order of the language's CLDR plural categories (zero, one, two, few, many,
 * other, leaving out the ones the language doesn't use). English has one and
 * other ("1 card | {n} cards"); Polish has one, few, many and other.
 */
const CLDR_ORDER = ["zero", "one", "two", "few", "many", "other"];

function pluralRule(locale: string) {
  const rules = new Intl.PluralRules(locale);
  const categories = CLDR_ORDER.filter((c) =>
    rules.resolvedOptions().pluralCategories.includes(c as Intl.LDMLPluralRule),
  );
  return (choice: number, choicesLength: number) => {
    const index = categories.indexOf(rules.select(choice));
    return Math.min(index === -1 ? choicesLength - 1 : index, choicesLength - 1);
  };
}

export default defineI18nConfig(() => ({
  fallbackLocale: "en",
  // Every locale gets the same rule, built for its own language.
  pluralRules: new Proxy({} as Record<string, ReturnType<typeof pluralRule>>, {
    get: (cache, locale: string) => (cache[locale] ??= pluralRule(locale)),
    has: () => true,
  }),
}));
