import { coverageOfVocab } from "#shared/coverage";
import { wordKey } from "#shared/words";
import type { Decision, SubtitleResponse, VocabEntry, WordUse } from "~/utils/api";

/**
 * A subtitle's words, cards and suggested words, and what the learner does
 * with them: mark a word known (or not), make a card for it, or decide on a
 * suggestion. Changes show at once: every use of the word changes colour and
 * "% you know" moves. While the subtitle is being analysed, it checks back
 * until the words are ready.
 */
export function useEpisodeWords() {
  const { errorText } = useErrorMessage();
  const { poll } = usePolling();
  const data = ref<SubtitleResponse | null>(null);
  const error = ref("");
  const busyWord = ref<string | null>(null);
  const deciding = ref(false);

  async function load(subtitleId: number) {
    error.value = "";
    try {
      data.value = await api<SubtitleResponse>(`/api/subtitles/${subtitleId}`);
      if (isAnalysing()) void waitForLemmas(subtitleId);
    } catch (e) {
      error.value = errorText(e);
    }
  }

  const isAnalysing = () =>
    data.value?.lemmas.state === "working" || data.value?.lemmas.state === "downloading-model";

  async function waitForLemmas(subtitleId: number) {
    try {
      data.value = await poll<SubtitleResponse>(
        () => api<SubtitleResponse>(`/api/subtitles/${subtitleId}`),
        (next) => {
          // Show the download's progress while waiting.
          if (data.value) data.value.lemmas = next.lemmas;
          return next.lemmas.state !== "working" && next.lemmas.state !== "downloading-model";
        },
        { intervalMs: 3000, timeoutMs: 30 * 60_000 },
      );
    } catch (e) {
      if (!(e instanceof PollingStopped)) error.value = errorText(e);
    }
  }

  async function retryLemmas() {
    if (!data.value) return;
    const id = data.value.subtitle.id;
    try {
      data.value.lemmas = (
        await api<{ lemmas: SubtitleResponse["lemmas"] }>(`/api/subtitles/${id}/lemmas/retry`, {
          method: "POST",
        })
      ).lemmas;
      void waitForLemmas(id);
    } catch (e) {
      error.value = errorText(e);
    }
  }

  const coverage = computed(() =>
    data.value?.transcript.lemmatised ? coverageOfVocab(data.value.transcript.vocab) : null,
  );

  /** The card for a word, if the learner has one from this subtitle. */
  function cardFor(entry: VocabEntry) {
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
      await api("/api/words", {
        method: "POST",
        body: { word: entry.word, known, language: data.value?.subtitle.language },
      });
    } catch (e) {
      entry.state = before;
      error.value = errorText(e);
    }
  }

  /** Make a card from a word; returns an error to show next to the word, or null. */
  async function makeCard(entry: VocabEntry, use: WordUse): Promise<string | null> {
    if (!data.value) return null;
    busyWord.value = entry.word;
    try {
      const { card } = await api<MadeCard>(`/api/subtitles/${data.value.subtitle.id}/cards`, {
        method: "POST",
        body: { ...use, lemma: data.value.transcript.lemmatised ? entry.word : null },
      });
      if (!data.value.cards.some((c) => c.id === card.id)) data.value.cards.push(card);
      data.value.suggestions = data.value.suggestions.filter((s) => wordKey(s.term) !== wordKey(card.term));
      entry.state = "learning";
      useDueCount().refresh();
      return null;
    } catch (e) {
      return errorText(e);
    } finally {
      busyWord.value = null;
    }
  }

  /** Learn, know or skip suggested words; the transcript reflects it straight away. */
  async function decide(ids: number[], decision: Decision) {
    if (!data.value || !ids.length) return;
    deciding.value = true;
    error.value = "";
    try {
      const { cards } = await api<DecideResult>("/api/suggestions", {
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
      error.value = errorText(e);
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
    retryLemmas,
    cardFor,
    firstUse,
    setKnown,
    makeCard,
    decide,
  };
}
