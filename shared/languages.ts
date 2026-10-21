/** Languages Learnarr offers, by ISO 639-1 code, with the ISO 639-2 codes media servers use. */
export const LANGUAGES = [
  { code: "en", name: "English", iso2: ["eng"] },
  { code: "es", name: "Spanish", iso2: ["spa"] },
  { code: "fr", name: "French", iso2: ["fre", "fra"] },
  { code: "de", name: "German", iso2: ["ger", "deu"] },
  { code: "it", name: "Italian", iso2: ["ita"] },
  { code: "pt", name: "Portuguese", iso2: ["por"] },
  { code: "nl", name: "Dutch", iso2: ["dut", "nld"] },
  { code: "pl", name: "Polish", iso2: ["pol"] },
  { code: "cs", name: "Czech", iso2: ["cze", "ces"] },
  { code: "sk", name: "Slovak", iso2: ["slo", "slk"] },
  { code: "da", name: "Danish", iso2: ["dan"] },
  { code: "sv", name: "Swedish", iso2: ["swe"] },
  { code: "no", name: "Norwegian", iso2: ["nor", "nob", "nno"] },
  { code: "fi", name: "Finnish", iso2: ["fin"] },
  { code: "ru", name: "Russian", iso2: ["rus"] },
  { code: "uk", name: "Ukrainian", iso2: ["ukr"] },
  { code: "tr", name: "Turkish", iso2: ["tur"] },
  { code: "el", name: "Greek", iso2: ["gre", "ell"] },
  { code: "hu", name: "Hungarian", iso2: ["hun"] },
  { code: "ro", name: "Romanian", iso2: ["rum", "ron"] },
  { code: "ja", name: "Japanese", iso2: ["jpn"] },
  { code: "ko", name: "Korean", iso2: ["kor"] },
  { code: "zh", name: "Chinese", iso2: ["chi", "zho"] },
  { code: "ar", name: "Arabic", iso2: ["ara"] },
  { code: "hi", name: "Hindi", iso2: ["hin"] },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function languageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

/**
 * The ISO 639-1 code for a language as a media server or file reports it:
 * "es", "es-ES", "spa", "Spanish" all give "es". Unknown gives null.
 */
export function toLanguageCode(value: string | null | undefined): LanguageCode | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const base = v.split(/[-_]/)[0] ?? v;
  const match = LANGUAGES.find(
    (l) => l.code === base || (l.iso2 as readonly string[]).includes(base) || l.name.toLowerCase() === v,
  );
  return match?.code ?? null;
}

export const LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type Level = (typeof LEVELS)[number];
