/** A word list, most common first, as rank by word (1 = most common). */
export function rankTable(list: string): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const word of list.split("\n")) if (word && !ranks.has(word)) ranks.set(word, ranks.size + 1);
  return ranks;
}

export type FrequencyLoader = (language: string) => Promise<string | null>;

/** Read from the lists bundled into the server build (scripts/build-frequency.mjs writes them). */
const bundled: FrequencyLoader = async (language) =>
  /^[a-z]{2}$/.test(language)
    ? ((await useStorage("assets:server").getItem<string>(`frequency/${language}.txt`)) ?? null)
    : null;

let loader = bundled;
const cache = new Map<string, Promise<Map<string, number> | null>>();

/** Rank by word for a language, or null when Learnarr has no list for it. */
export function frequencyRanks(language: string): Promise<Map<string, number> | null> {
  let ranks = cache.get(language);
  if (!ranks) {
    ranks = loader(language).then((list) => (list ? rankTable(list) : null));
    cache.set(language, ranks);
  }
  return ranks;
}

/** The better (lower) rank of a word's dictionary form and the form it was used in. */
export function wordRank(ranks: Map<string, number> | null, ...forms: (string | null | undefined)[]) {
  let best: number | null = null;
  for (const form of forms) {
    const rank = form ? ranks?.get(form.toLocaleLowerCase()) : undefined;
    if (rank && (best === null || rank < best)) best = rank;
  }
  return best;
}

export function setFrequencyLoaderForTests(next: FrequencyLoader | undefined) {
  loader = next ?? bundled;
  cache.clear();
}
