import { AiError } from "./client";

/**
 * What both prompts ask for about each word, so a card from a suggestion and a
 * card from a tapped word describe it the same way.
 */
export function wordFields(native: string): string[] {
  return [
    '- "term": the dictionary form (infinitive for verbs, singular for nouns, masculine singular for adjectives where the language has gender);',
    `- "translation": a short ${native} meaning, as used in that line;`,
    '- "partOfSpeech": one of noun, verb, adjective, adverb, phrase, other;',
    `- "note": an optional short ${native} usage or grammar note (under 80 characters), or "".`,
  ];
}

/** The JSON object in a model's answer, tolerating code fences and chatter around it. */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new AiError("errors.ai.notJson");
  try {
    return JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    throw new AiError("errors.ai.notJson");
  }
}
