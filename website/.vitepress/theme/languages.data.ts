import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "../../../shared/languages";

/**
 * The languages table on wiki/languages, read from Learnarr's own source at
 * build time: which languages have a pinned lemmatiser model (TREEBANKS in
 * server/utils/lemmas/models.ts) and which have a frequency list.
 */
const repo = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));

export interface LanguageRow {
  code: string;
  name: string;
  treebank: string | null;
  frequency: boolean;
}

export default {
  watch: ["../../../server/utils/lemmas/models.ts", "../../../shared/languages.ts"],
  load(): LanguageRow[] {
    const models = fs.readFileSync(repo("server/utils/lemmas/models.ts"), "utf8");
    const block = models.slice(
      models.indexOf("const TREEBANKS"),
      models.indexOf("};", models.indexOf("const TREEBANKS")),
    );
    const treebanks = new Map([...block.matchAll(/^\s+(\w+): "([\w-]+)",/gm)].map((m) => [m[1]!, m[2]!]));
    const lists = new Set(
      fs.readdirSync(repo("server/assets/frequency")).map((f) => f.replace(/\.txt$/, "")),
    );
    return LANGUAGES.map((l) => ({
      code: l.code,
      name: l.name,
      treebank: treebanks.get(l.code) ?? null,
      frequency: lists.has(l.code),
    })).toSorted((a, b) => a.name.localeCompare(b.name));
  },
};
