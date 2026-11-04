import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "../i18n/locales/en.json";

/** Every message key in a catalog, as "a.b.c". */
function keysOf(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    keysOf(v, prefix ? `${prefix}.${k}` : k),
  );
}

function filesIn(dir: string, extensions: string[]): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesIn(full, extensions);
    return extensions.includes(path.extname(entry.name)) ? [full] : [];
  });
}

const sources = [
  ...filesIn("app", [".vue", ".ts"]),
  ...filesIn("server", [".ts"]),
  ...filesIn("shared", [".ts"]),
];
const known = new Set(keysOf(en));

/**
 * Message keys written literally in the code: in t()/$t() calls, keypath=
 * attributes, and anywhere an "errors." key is quoted (errors are thrown with
 * their key). Keys built from a variable (`words.bands.${band}`) are checked
 * by their prefix.
 */
function usedKeys(): { file: string; key: string }[] {
  const key = String.raw`([a-zA-Z]+\.[\w.]+)(\$\{)?`;
  const patterns = [
    new RegExp(String.raw`\$?\bt\(\s*["'\`]` + key, "g"),
    new RegExp(String.raw`keypath=["']` + key, "g"),
    new RegExp(String.raw`["'\`](errors\.[\w.]+)(\$\{)?`, "g"),
  ];
  const found: { file: string; key: string }[] = [];
  for (const file of sources) {
    const text = fs.readFileSync(file, "utf8");
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        found.push({ file, key: match[2] ? `${match[1]}*` : match[1]! });
      }
    }
  }
  return found;
}

describe("the message catalog", () => {
  it("has every key the code uses", () => {
    const used = usedKeys();
    expect(used.length).toBeGreaterThan(200);
    const missing = used.filter(({ key }) => {
      if (key.endsWith("*")) {
        const prefix = key.slice(0, -1);
        return ![...known].some((k) => k.startsWith(prefix));
      }
      // A key that names a group (used as a prefix elsewhere) is fine.
      return !known.has(key) && ![...known].some((k) => k.startsWith(`${key}.`));
    });
    expect(missing.map(({ file, key }) => `${key} (${file})`)).toEqual([]);
  });

  it("uses only {placeholders} and |plurals, no characters vue-i18n treats as syntax", () => {
    const bad = keysOf(en).filter((key) => {
      let node: unknown = en;
      for (const part of key.split(".")) node = (node as Record<string, unknown>)[part];
      return /[@$]|\{[^}\w]|\{\s*\}/.test(node as string);
    });
    expect(bad).toEqual([]);
  });
});
