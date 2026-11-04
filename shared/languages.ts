/**
 * Languages Learnarr offers, by ISO 639-1 code, with the ISO 639-2 codes media
 * servers use. `name` is the English name; the interface shows each language
 * in the reader's own language through Intl.DisplayNames.
 */
export const LANGUAGES = [
  { code: "af", name: "Afrikaans", iso2: ["afr"] },
  { code: "sq", name: "Albanian", iso2: ["alb", "sqi"] },
  { code: "ar", name: "Arabic", iso2: ["ara"] },
  { code: "hy", name: "Armenian", iso2: ["arm", "hye"] },
  { code: "eu", name: "Basque", iso2: ["baq", "eus"] },
  { code: "be", name: "Belarusian", iso2: ["bel"] },
  { code: "bn", name: "Bengali", iso2: ["ben"] },
  { code: "bs", name: "Bosnian", iso2: ["bos"] },
  { code: "bg", name: "Bulgarian", iso2: ["bul"] },
  { code: "ca", name: "Catalan", iso2: ["cat"] },
  { code: "zh", name: "Chinese", iso2: ["chi", "zho"] },
  { code: "hr", name: "Croatian", iso2: ["hrv"] },
  { code: "cs", name: "Czech", iso2: ["cze", "ces"] },
  { code: "da", name: "Danish", iso2: ["dan"] },
  { code: "nl", name: "Dutch", iso2: ["dut", "nld"] },
  { code: "en", name: "English", iso2: ["eng"] },
  { code: "et", name: "Estonian", iso2: ["est"] },
  { code: "fi", name: "Finnish", iso2: ["fin"] },
  { code: "fr", name: "French", iso2: ["fre", "fra"] },
  { code: "gl", name: "Galician", iso2: ["glg"] },
  { code: "ka", name: "Georgian", iso2: ["geo", "kat"] },
  { code: "de", name: "German", iso2: ["ger", "deu"] },
  { code: "el", name: "Greek", iso2: ["gre", "ell"] },
  { code: "he", name: "Hebrew", iso2: ["heb"] },
  { code: "hi", name: "Hindi", iso2: ["hin"] },
  { code: "hu", name: "Hungarian", iso2: ["hun"] },
  { code: "is", name: "Icelandic", iso2: ["ice", "isl"] },
  { code: "id", name: "Indonesian", iso2: ["ind"] },
  { code: "ga", name: "Irish", iso2: ["gle"] },
  { code: "it", name: "Italian", iso2: ["ita"] },
  { code: "ja", name: "Japanese", iso2: ["jpn"] },
  { code: "kk", name: "Kazakh", iso2: ["kaz"] },
  { code: "ko", name: "Korean", iso2: ["kor"] },
  { code: "lv", name: "Latvian", iso2: ["lav"] },
  { code: "lt", name: "Lithuanian", iso2: ["lit"] },
  { code: "mk", name: "Macedonian", iso2: ["mac", "mkd"] },
  { code: "ms", name: "Malay", iso2: ["may", "msa"] },
  { code: "mt", name: "Maltese", iso2: ["mlt"] },
  { code: "mr", name: "Marathi", iso2: ["mar"] },
  { code: "se", name: "Northern Sami", iso2: ["sme"] },
  { code: "no", name: "Norwegian", iso2: ["nor", "nob"] },
  { code: "nn", name: "Norwegian Nynorsk", iso2: ["nno"] },
  { code: "fa", name: "Persian", iso2: ["per", "fas"] },
  { code: "pl", name: "Polish", iso2: ["pol"] },
  { code: "pt", name: "Portuguese", iso2: ["por"] },
  { code: "ro", name: "Romanian", iso2: ["rum", "ron"] },
  { code: "ru", name: "Russian", iso2: ["rus"] },
  { code: "gd", name: "Scottish Gaelic", iso2: ["gla"] },
  { code: "sr", name: "Serbian", iso2: ["srp"] },
  { code: "sk", name: "Slovak", iso2: ["slo", "slk"] },
  { code: "sl", name: "Slovenian", iso2: ["slv"] },
  { code: "es", name: "Spanish", iso2: ["spa"] },
  { code: "sv", name: "Swedish", iso2: ["swe"] },
  { code: "tl", name: "Tagalog", iso2: ["tgl", "fil"] },
  { code: "ta", name: "Tamil", iso2: ["tam"] },
  { code: "te", name: "Telugu", iso2: ["tel"] },
  { code: "th", name: "Thai", iso2: ["tha"] },
  { code: "tr", name: "Turkish", iso2: ["tur"] },
  { code: "uk", name: "Ukrainian", iso2: ["ukr"] },
  { code: "ur", name: "Urdu", iso2: ["urd"] },
  { code: "ug", name: "Uyghur", iso2: ["uig"] },
  { code: "vi", name: "Vietnamese", iso2: ["vie"] },
  { code: "wo", name: "Wolof", iso2: ["wol"] },
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
