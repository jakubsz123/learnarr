import { describe, expect, it } from "vitest";
import { testDb } from "./helpers";
import { define, parseDefinitions, plainText } from "../server/utils/dictionary";

// The shape of en.wiktionary.org/api/rest_v1/page/definition/<word>.
const GATOS = {
  es: [
    {
      partOfSpeech: "Noun",
      language: "Spanish",
      definitions: [
        {
          definition:
            '<span class="form-of-definition use-with-mention">plural of <span class="form-of-definition-link"><i class="Latn mention" lang="es"><a rel="mw:WikiLink" href="/wiki/gato#Spanish" title="gato">gato</a></i></span></span>',
        },
      ],
    },
  ],
};
const GATO = {
  es: [
    {
      partOfSpeech: "Noun",
      language: "Spanish",
      definitions: [
        { definition: '<a href="/wiki/cat">cat</a><style>.x{color:red}</style>' },
        { definition: "(<i>Mexico</i>) car jack &amp; lifter" },
      ],
    },
  ],
  en: [{ partOfSpeech: "Noun", definitions: [{ definition: "an English word" }] }],
};

describe("Wiktionary definitions", () => {
  it("turns definition HTML into text, dropping inline stylesheets", () => {
    expect(plainText('<a href="/x">cat</a><style>.x{color:red}</style> &amp; more')).toBe("cat & more");
    expect(parseDefinitions(GATO, "es").entries).toEqual([
      { partOfSpeech: "Noun", definitions: ["cat", "(Mexico) car jack & lifter"] },
    ]);
    expect(parseDefinitions(GATO, "fr").entries).toEqual([]);
  });

  it("follows a form to its base word, and caches what it found", async () => {
    const db = testDb();
    const asked: string[] = [];
    const fetchFn = (async (url: string) => {
      asked.push(url);
      const word = decodeURIComponent(url.split("/").at(-1)!);
      return new Response(JSON.stringify(word === "gatos" ? GATOS : word === "gato" ? GATO : {}));
    }) as unknown as typeof fetch;
    const found = await define(db, "es", ["gatos"], fetchFn);
    expect(found?.entries[0]).toMatchObject({
      definitions: ["cat", "(Mexico) car jack & lifter"],
      formOf: "gato",
    });
    await define(db, "es", ["gatos"], fetchFn);
    expect(asked).toHaveLength(2);
  });

  it("doesn't remember an outage as 'no definition'", async () => {
    const db = testDb();
    let status = 503;
    const fetchFn = (async () =>
      status === 503
        ? new Response("busy", { status })
        : new Response(JSON.stringify(GATO))) as unknown as typeof fetch;
    expect(await define(db, "es", ["gato"], fetchFn)).toBeNull();
    status = 200;
    expect((await define(db, "es", ["gato"], fetchFn))?.entries).toHaveLength(1);
  });

  it("says when Wiktionary can't be reached, rather than that it has nothing", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await define(testDb(), "es", ["perro"], failing)).toBeNull();
  });
});
