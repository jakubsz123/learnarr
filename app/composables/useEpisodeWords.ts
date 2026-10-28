import { wordKey } from "#shared/words";
import type { Card, Decision, SubtitleResponse, VocabEntry, WordUse } from "~/utils/api";

/**
 * A subtitle's words, cards and suggested words, and what the learner does
 * with a word: mark it known (or not), make a card for it, or decide on a
 * suggestion. Changes show at once: every use of the word changes colour and
 * "% you know" moves.
 */
export function useEpisodeWords() {
  const data = ref<SubtitleResponse | null>(null);
  const error = ref("");
  const busyWord = ref<string | null>(null);

  async function load(subtitleId: number) {
    error.value = "";
    try {
      data.value = await $fetch<SubtitleResponse>(`/api/subtitles/${subtitleId}`);
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  const coverage = computed(() => {
    const t = data.value?.transcript;
    if (!t?.lemmatised) return null;
    let total = 0;
    let known = 0;
    for (const entry of t.vocab) {
      total += entry.count;
      if (entry.state === "known") known += entry.count;
    }
    return total ? known / total : null;
  });

  /** The card for a word, if the learner has one from this subtitle. */
  function cardFor(entry: VocabEntry): Card | undefined {
    return data.value?.cards.find(
      (c) => wordKey(c.term) === entry.word || entry.forms.includes(wordKey(c.form)),
    );
  }

  /** Where a word is first used, to make its card from. */
  function firstUse(index: number): WordUse | null {
    const lines = data.value?.transcript.lines ?? [];
    for (let cue = 0; cue < lines.length; cue++) {
      const hit = lines[cue]!.find((w) => w[2] === index);
      if (hit) return { cue, start: hit[0], end: hit[1] };
    }
    return null;
  }

  async function setKnown(entry: VocabEntry, known: boolean) {
    const before = entry.state;
    entry.state = known ? "known" : cardFor(entry) ? "learning" : null;
    try {
      await $fetch("/api/words", {
        method: "POST",
        body: { word: entry.word, known, language: data.value?.subtitle.language },
      });
    } catch (e) {
      entry.state = before;
      error.value = errorMessage(e);
    }
  }

  async function makeCard(entry: VocabEntry, use: WordUse) {
    if (!data.value) return;
    busyWord.value = entry.word;
    error.value = "";
    try {
      const { card } = await $fetch<{ card: Card }>(`/api/subtitles/${data.value.subtitle.id}/cards`, {
        method: "POST",
        body: { ...use, lemma: data.value.transcript.lemmatised ? entry.word : null },
      });
      if (!data.value.cards.some((c) => c.id === card.id)) data.value.cards.push(card);
      data.value.suggestions = data.value.suggestions.filter((s) => wordKey(s.term) !== wordKey(card.term));
      entry.state = "learning";
      useDueCount().refresh();
      return card;
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      busyWord.value = null;
    }
  }

  const deciding = ref(false);

  /** Learn, know or skip suggested words; the transcript reflects it straight away. */
  async function decide(ids: number[], decision: Decision) {
    if (!data.value || !ids.length) return;
    deciding.value = true;
    error.value = "";
    try {
      const { cards } = await $fetch<{ cards: Card[] }>("/api/suggestions", {
        method: "POST",
        body: { ids, decision },
      });
      const decided = data.value.suggestions.filter((s) => ids.includes(s.id));
      data.value.suggestions = data.value.suggestions.filter((s) => !ids.includes(s.id));
      data.value.cards.push(...cards);
      if (decision !== "skip") {
        const state = decision === "know" ? "known" : "learning";
        const terms = new Set(decided.map((s) => wordKey(s.term)));
        for (const entry of data.value.transcript.vocab) if (terms.has(entry.word)) entry.state = state;
      }
      if (cards.length) useDueCount().refresh();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      deciding.value = false;
    }
  }

  return {
    data,
    error,
    busyWord,
    deciding,
    coverage,
    load,
    cardFor,
    firstUse,
    setKnown,
    makeCard,
    decide,
  };
}
