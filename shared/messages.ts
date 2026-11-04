import en from "../i18n/locales/en.json";
import { languageName } from "./languages";

/**
 * Messages from the catalogs outside Vue: the server's error messages and the
 * notifications it sends. The interface itself uses @nuxtjs/i18n with the same
 * files, so a translation added for the app covers these too.
 *
 * To add a language here, import its file and add it to CATALOGS (the app
 * picks it up from nuxt.config.ts). See website/wiki/translating.md.
 */
const CATALOGS: Record<string, unknown> = { en };

type Leaves<T, Prefix extends string> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type ErrorKey = Leaves<(typeof en)["errors"], "errors.">;
export type NotificationKey = Leaves<(typeof en)["notifications"], "notifications.">;
export type MessageParams = Record<string, string | number>;

function lookup(catalog: unknown, key: string): string | null {
  let node = catalog;
  for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  return typeof node === "string" ? node : null;
}

/**
 * A message in a language, falling back to English. `{name}` placeholders are
 * filled from params; a parameter called `language` is a language code, shown
 * as the language's name. A message with forms separated by `|` is a plural,
 * chosen by the `count` parameter (see i18n/i18n.config.ts).
 */
export function translate(
  locale: string,
  key: ErrorKey | NotificationKey,
  params: MessageParams = {},
): string {
  const text = lookup(CATALOGS[locale], key) ?? lookup(en, key) ?? key;
  const forms = text.split(/\s*\|\s*/);
  let chosen = forms[0]!;
  if (forms.length > 1 && typeof params.count === "number") {
    const rules = new Intl.PluralRules(locale);
    const categories = ["zero", "one", "two", "few", "many", "other"].filter((c) =>
      rules.resolvedOptions().pluralCategories.includes(c as Intl.LDMLPluralRule),
    );
    const index = categories.indexOf(rules.select(params.count));
    chosen = forms[Math.min(index === -1 ? forms.length - 1 : index, forms.length - 1)]!;
  }
  return chosen.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in params)) return match;
    const value = String(params[name]);
    return name === "language" ? languageName(value) : value;
  });
}

export function englishMessage(key: ErrorKey | NotificationKey, params: MessageParams = {}): string {
  return translate("en", key, params);
}
