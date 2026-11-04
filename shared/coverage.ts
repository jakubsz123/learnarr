/**
 * What "% you know" means for watching something. Reading research puts the
 * line for following a text unaided at about 95% of its running words, and
 * comfortable at 98%; below 85% most lines have a gap. The labels are in the
 * message catalog under coverage.tiers.
 */
export const COVERAGE_TIERS = [
  { id: "easy", from: 0.98 },
  { id: "ideal", from: 0.95 },
  { id: "stretch", from: 0.85 },
  { id: "hard", from: 0 },
] as const;

export type CoverageTier = (typeof COVERAGE_TIERS)[number]["id"];

export function coverageTier(coverage: number | null | undefined): CoverageTier | null {
  if (coverage === null || coverage === undefined) return null;
  return COVERAGE_TIERS.find((t) => coverage >= t.from)?.id ?? "hard";
}

/** Share of the counted uses of words that are known, 0–1, or null when nothing counts. */
export function coverageOfVocab(vocab: { count: number; state: string | null }[]): number | null {
  let total = 0;
  let known = 0;
  for (const entry of vocab) {
    total += entry.count;
    if (entry.state === "known") known += entry.count;
  }
  return total ? known / total : null;
}

/** Rounded down, so 99.6% never shows as everything. */
export function formatCoverage(coverage: number | null | undefined): string {
  return coverage === null || coverage === undefined ? "—" : `${Math.floor(coverage * 100)}%`;
}
