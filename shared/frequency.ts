/**
 * How common a word is, from its rank in the language's frequency list
 * (server/assets/frequency). The lists stop at 10,000 words, so anything past
 * that is "rare" rather than unranked. The bands' names are in the message
 * catalog under words.bands.
 */
export const FREQUENCY_BANDS = [
  { id: "top", upTo: 1000 },
  { id: "common", upTo: 3000 },
  { id: "less", upTo: 10_000 },
] as const;

export type FrequencyBand = (typeof FREQUENCY_BANDS)[number]["id"] | "rare";

export function frequencyBand(rank: number | null | undefined): FrequencyBand {
  if (!rank) return "rare";
  return FREQUENCY_BANDS.find((b) => rank <= b.upTo)?.id ?? "rare";
}
