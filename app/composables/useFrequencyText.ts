import { frequencyBand } from "#shared/frequency";

/** "Very common · #512": how common a word is, from its rank in the language's frequency list. */
export function useFrequencyText() {
  const { t, n } = useI18n();
  return {
    frequencyText(rank: number | null | undefined) {
      const band = frequencyBand(rank);
      return band === "rare"
        ? t("words.bands.rare")
        : t("words.rank", { band: t(`words.bands.${band}`), rank: n(rank!) });
    },
  };
}
