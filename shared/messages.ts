import en from "../i18n/locales/en.json";
import { languageName } from "./languages";

/**
 * Reading messages from the English catalog outside Vue, for the server's
 * error messages. The browser shows the same key in the reader's language;
 * the English text goes along for logs, curl and anything that isn't Learnarr's
 * own interface.
 */

type Leaves<T, Prefix extends string> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type ErrorKey = Leaves<(typeof en)["errors"], "errors.">;
export type MessageParams = Record<string, string | number>;

/**
 * The English message for a key, with `{name}` placeholders filled in. A
 * parameter called `language` is a language code, shown as the language's name
 * (the browser does the same in the reader's language).
 */
export function englishMessage(key: ErrorKey, params: MessageParams = {}): string {
  let node: unknown = en;
  for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part];
  if (typeof node !== "string") return key;
  return node.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in params)) return match;
    const value = String(params[name]);
    return name === "language" ? languageName(value) : value;
  });
}
