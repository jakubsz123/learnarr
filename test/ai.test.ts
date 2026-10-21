import { describe, expect, it } from "vitest";
import { complete, listModels, type AiConfig } from "../server/utils/ai/client";
import { buildPrompt, extractJson, parseAnswer, sampleCues } from "../server/utils/ai/pickWords";
import type { Cue } from "../shared/subtitles";

function fakeFetch(body: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const openai: AiConfig = {
  provider: "openai-compatible",
  baseUrl: "https://api.example/v1/",
  apiKey: "sk",
  model: "m",
};
const anthropic: AiConfig = {
  provider: "anthropic",
  baseUrl: "https://api.anthropic.com",
  apiKey: "ak",
  model: "c",
};

describe("AI connectors", () => {
  it("calls an OpenAI-compatible chat endpoint with a bearer key", async () => {
    const fake = fakeFetch({ choices: [{ message: { content: "hi" } }] });
    expect(await complete(openai, "sys", "user", fake.fn)).toBe("hi");
    expect(fake.calls[0]!.url).toBe("https://api.example/v1/chat/completions");
    expect((fake.calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer sk");
    const body = JSON.parse(String(fake.calls[0]!.init.body));
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "user" },
    ]);
  });

  it("sends no key header when a local server needs none", async () => {
    const fake = fakeFetch({ choices: [{ message: { content: "x" } }] });
    await complete({ ...openai, apiKey: null, baseUrl: "http://localhost:11434/v1" }, "s", "u", fake.fn);
    expect((fake.calls[0]!.init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("calls Anthropic's messages API and joins its text blocks", async () => {
    const fake = fakeFetch({
      content: [{ type: "text", text: "a" }, { type: "thinking" }, { type: "text", text: "b" }],
    });
    expect(await complete(anthropic, "sys", "user", fake.fn)).toBe("ab");
    expect(fake.calls[0]!.url).toBe("https://api.anthropic.com/v1/messages");
    const headers = fake.calls[0]!.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("ak");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(JSON.parse(String(fake.calls[0]!.init.body))).toMatchObject({
      system: "sys",
      max_tokens: expect.any(Number),
    });
  });

  it("explains a rejected key and an empty answer", async () => {
    await expect(complete(openai, "s", "u", fakeFetch({}, 401).fn)).rejects.toThrow(/rejected the API key/);
    await expect(
      complete(openai, "s", "u", fakeFetch({ choices: [{ finish_reason: "length", message: {} }] }).fn),
    ).rejects.toThrow(/ran out of room/);
  });

  it("lists models from either provider", async () => {
    expect(await listModels(openai, fakeFetch({ data: [{ id: "b" }, { id: "a" }] }).fn)).toEqual(["a", "b"]);
    const fake = fakeFetch({ data: [{ id: "claude" }] });
    expect(await listModels(anthropic, fake.fn)).toEqual(["claude"]);
    expect(fake.calls[0]!.url).toContain("/v1/models");
  });
});

const cues: Cue[] = [
  { index: 0, startMs: 0, endMs: 1, text: "Tenemos que aguantar un poco más." },
  { index: 1, startMs: 2, endMs: 3, text: "No me da la gana." },
  { index: 2, startMs: 4, endMs: 5, text: "¿Dónde está la bóveda?" },
];

describe("picking words", () => {
  it("numbers the lines and lists the words to avoid", () => {
    const { system, user } = buildPrompt({
      cues,
      language: "es",
      nativeLanguage: "en",
      level: "intermediate",
      count: 5,
      known: ["casa"],
    });
    expect(system).toContain("learning Spanish");
    expect(system).toContain("Pick the 5");
    expect(user).toContain("Already learning: casa");
    expect(user).toContain("2: No me da la gana.");
  });

  it("samples long subtitles evenly", () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ index: i, startMs: i, endMs: i, text: `${i}` }));
    const sampled = sampleCues(many, 100);
    expect(sampled).toHaveLength(100);
    expect(sampled[0]!.index).toBe(0);
    expect(sampled[99]!.index).toBe(4950);
  });

  it("finds JSON inside fences and chatter", () => {
    expect(extractJson('Sure!\n```json\n{"words": []}\n```')).toEqual({ words: [] });
    expect(() => extractJson("no json here")).toThrow(/JSON/);
  });

  it("keeps words that point at a line containing them, and finds the line when the number is off", () => {
    const answer = JSON.stringify({
      words: [
        {
          term: "aguantar",
          form: "aguantar",
          translation: "to hold out",
          partOfSpeech: "verb",
          line: 1,
          note: "",
        },
        {
          term: "dar la gana",
          form: "da la gana",
          translation: "to feel like",
          partOfSpeech: "phrase",
          line: 3,
        },
        { term: "inventado", form: "inventado", translation: "made up", line: 2 },
        { term: "Bóveda", form: "bóveda", translation: "vault", line: "3" },
        { term: "casa", form: "aguantar", translation: "house", line: 1 },
      ],
    });
    const words = parseAnswer(answer, { cues, known: ["casa"], count: 10 });
    expect(words.map((w) => [w.term, w.cue.index])).toEqual([
      ["aguantar", 0],
      ["dar la gana", 1],
      ["Bóveda", 2],
    ]);
    expect(words[0]).toMatchObject({ partOfSpeech: "verb", note: null });
  });

  it("stops at the requested count and skips duplicates", () => {
    const answer = JSON.stringify({
      words: [
        { term: "aguantar", form: "aguantar", translation: "a", line: 1 },
        { term: "Aguantar", form: "aguantar", translation: "b", line: 1 },
        { term: "bóveda", form: "bóveda", translation: "c", line: 3 },
      ],
    });
    expect(parseAnswer(answer, { cues, known: [], count: 1 }).map((w) => w.translation)).toEqual(["a"]);
    expect(parseAnswer(answer, { cues, known: [], count: 5 }).map((w) => w.translation)).toEqual(["a", "c"]);
  });
});
