/**
 * How common a word is, from its rank in the language's frequency list
 * (server/assets/frequency). The lists stop at 10,000 words, so anything past
 * that is "rare" rather than unranked.
 */
export const FREQUENCY_BANDS = [
  { id: "top", upTo: 1000, label: "Very common" },
  { id: "common", upTo: 3000, label: "Common" },
  { id: "less", upTo: 10_000, label: "Less common" },
] as const;

export type FrequencyBand = (typeof FREQUENCY_BANDS)[number]["id"] | "rare";

export function frequencyBand(rank: number | null | undefined): FrequencyBand {
  if (!rank) return "rare";
  return FREQUENCY_BANDS.find((b) => rank <= b.upTo)?.id ?? "rare";
}

export function frequencyLabel(rank: number | null | undefined): string {
  const band = FREQUENCY_BANDS.find((b) => b.id === frequencyBand(rank));
  return band ? `${band.label} · #${rank}` : "Rare";
}
