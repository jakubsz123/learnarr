/**
 * What "% you know" means for watching something. Reading research puts the
 * line for following a text unaided at about 95% of its running words, and
 * comfortable at 98%; below 85% most lines have a gap.
 */
export const COVERAGE_TIERS = [
  { id: "easy", from: 0.98, label: "Easy going" },
  { id: "ideal", from: 0.95, label: "Just right" },
  { id: "stretch", from: 0.85, label: "A stretch" },
  { id: "hard", from: 0, label: "Hard going" },
] as const;

export type CoverageTier = (typeof COVERAGE_TIERS)[number];

export function coverageTier(coverage: number | null | undefined): CoverageTier | null {
  if (coverage === null || coverage === undefined) return null;
  return COVERAGE_TIERS.find((t) => coverage >= t.from) ?? COVERAGE_TIERS[3];
}

/** Rounded down, so 99.6% never shows as everything. */
export function formatCoverage(coverage: number | null | undefined): string {
  return coverage === null || coverage === undefined ? "—" : `${Math.floor(coverage * 100)}%`;
}
