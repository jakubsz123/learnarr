<template>
  <div class="stack" style="gap: 20px">
    <header class="head">
      <PosterImage
        :id="item.type === 'episode' && item.showId ? item.showId : item.id"
        :alt="item.showTitle ?? item.title"
        :has-poster="item.hasPoster"
        :width="240"
        class="head-poster"
      />
      <div class="stack" style="gap: 4px; min-width: 0">
        <NuxtLink v-if="item.showId" :to="showLink" class="muted show-link">{{ item.showTitle }}</NuxtLink>
        <h1 class="page-title">
          <template v-if="item.type === 'episode'">{{ episodeLabel(item) }} · </template>{{ item.title }}
        </h1>
        <span v-if="item.year && item.type === 'movie'" class="hint">{{ item.year }}</span>
        <NuxtLink v-if="next" :to="`/media/${next.id}`" class="next-link">
          Next: {{ episodeLabel(next) }} · {{ next.title }} <AppIcon name="next" :size="16" />
        </NuxtLink>
      </div>
    </header>

    <p v-if="words.error.value" class="notice danger" role="alert">{{ words.error.value }}</p>

    <!-- No subtitle yet: get one. -->
    <section v-if="!progress" class="panel stack">
      <h2 class="panel-title">Get the subtitle</h2>
      <p class="muted">{{ subtitleHint }}</p>
      <div>
        <button type="button" class="btn btn-primary" :disabled="fetching" @click="getSubtitle">
          {{ fetching ? "Getting it…" : "Get subtitle" }}
        </button>
      </div>
      <p v-if="fetchError" class="danger" role="alert">{{ fetchError }}</p>
    </section>

    <template v-else-if="sub">
      <section class="panel overview">
        <CoverageBadge
          :coverage="words.coverage.value"
          size="lg"
          :empty-label="sub.transcript.lemmatised ? 'No words' : 'Not scored yet'"
        />
        <dl class="numbers">
          <div>
            <dt>Words</dt>
            <dd>{{ wordCount }}</dd>
          </div>
          <div>
            <dt>New to you</dt>
            <dd>{{ newCount }}</dd>
          </div>
          <div>
            <dt>Cards</dt>
            <dd>{{ sub.cards.length }}</dd>
          </div>
        </dl>
        <p class="hint lemma-note" :class="{ danger: lemmaFailed }">{{ lemmaNote }}</p>
        <button v-if="lemmaFailed" type="button" class="btn" @click="retryLemmas">Try again</button>
      </section>

      <section class="panel stack">
        <div class="row" style="justify-content: space-between">
          <h2 class="panel-title">Pick words with AI</h2>
          <NuxtLink v-if="sub.cards.length" to="/study" class="btn">Study</NuxtLink>
        </div>
        <p class="muted">
          {{
            sub.cards.length
              ? "Your AI provider reads the whole subtitle and adds the next words worth learning at your level."
              : "Your AI provider reads the whole subtitle and picks the words worth learning at your level. Or tap words yourself below."
          }}
        </p>
        <div class="row" role="group" aria-label="How many words">
          <button
            v-for="n in COUNTS"
            :key="n"
            type="button"
            class="count"
            :aria-pressed="count === n ? 'true' : 'false'"
            @click="count = n"
          >
            {{ n }}
          </button>
          <button type="button" class="btn btn-primary" :disabled="picking" @click="pick">
            {{ picking ? "Picking words…" : sub.cards.length ? "Pick more" : "Pick words" }}
          </button>
        </div>
        <p v-if="picking" class="hint">
          This can take a minute, longer with a local model. You can leave this page.
        </p>
        <p v-if="pickMessage" :class="pickOk ? 'ok' : 'danger'" role="status">{{ pickMessage }}</p>
      </section>

      <div class="tabs" role="tablist" aria-label="This episode">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          role="tab"
          class="tab"
          :aria-selected="tab === t.id ? 'true' : 'false'"
          @click="tab = t.id"
        >
          {{ t.label }}<template v-if="t.id === 'cards'"> ({{ sub.cards.length }})</template>
        </button>
      </div>

      <VocabList
        v-if="tab === 'words'"
        :vocab="sub.transcript.vocab"
        :language="sub.subtitle.language"
        :lemmatised="sub.transcript.lemmatised"
        @pick="(i) => select(i, null)"
        @known="(i, known) => words.setKnown(sub!.transcript.vocab[i]!, known)"
      />

      <div v-else-if="tab === 'transcript'" class="stack">
        <div class="row">
          <label class="toggle"><input v-model="highlight" type="checkbox" /> Highlight new words</label>
          <label class="toggle"><input v-model="onlyNew" type="checkbox" /> Only lines with new words</label>
        </div>
        <TranscriptView
          :cues="sub.cues"
          :transcript="sub.transcript"
          :language="sub.subtitle.language"
          :highlight="highlight"
          :only-new="onlyNew"
          :selected="selected?.index ?? null"
          @pick="select"
        />
      </div>

      <div v-else class="stack">
        <ul v-if="sub.cards.length" class="card-list">
          <li v-for="card in sortedCards" :key="card.id">
            <CardItem :card="card" @updated="(c) => Object.assign(card, c)" />
          </li>
        </ul>
        <p v-else class="muted">No cards from this yet. Pick words with AI, or tap a word to make one.</p>
      </div>
    </template>

    <p v-else class="muted">Loading the subtitle…</p>

    <WordSheet
      v-if="selected && selectedEntry && sub"
      :entry="selectedEntry"
      :used-form="sheetUse ? sub.cues[sheetUse.cue]?.text.slice(sheetUse.start, sheetUse.end) : undefined"
      :line="sheetUse ? sub.cues[sheetUse.cue]?.text : undefined"
      :card="words.cardFor(selectedEntry)"
      :lemmatised="sub.transcript.lemmatised"
      :language="sub.subtitle.language"
      :busy="words.busyWord.value === selectedEntry.word"
      :can-card="!!sheetUse"
      @close="selected = null"
      @known="(known) => words.setKnown(selectedEntry!, known)"
      @card="sheetUse && words.makeCard(selectedEntry!, sheetUse)"
    />
  </div>
</template>

<script setup lang="ts">
import { languageName } from "#shared/languages";
import type { MediaResponse, WordUse } from "~/utils/api";

const props = defineProps<{ data: MediaResponse }>();
const emit = defineEmits<{ reload: [] }>();

const COUNTS = [10, 20, 30] as const;
const TABS = [
  { id: "words", label: "Words" },
  { id: "transcript", label: "Transcript" },
  { id: "cards", label: "Cards" },
] as const;

const { me } = useMe();
const words = useEpisodeWords();
const sub = words.data;

const item = computed(() => props.data.item);
const next = computed(() => props.data.next);
const progress = computed(() => props.data.progress[item.value.id]);
const showLink = computed(() =>
  item.value.seasonId
    ? `/media/${item.value.showId}?season=${item.value.seasonId}`
    : `/media/${item.value.showId}`,
);

const tab = ref<(typeof TABS)[number]["id"]>("words");
const highlight = ref(true);
const onlyNew = ref(false);
const selected = ref<{ index: number; use: WordUse | null } | null>(null);
const selectedEntry = computed(() =>
  selected.value ? sub.value?.transcript.vocab[selected.value.index] : undefined,
);
const sheetUse = computed(
  () => selected.value?.use ?? (selected.value ? words.firstUse(selected.value.index) : null),
);

function select(index: number, use: WordUse | null) {
  selected.value = { index, use };
}

const counted = computed(() => sub.value?.transcript.vocab.filter((v) => v.count > 0) ?? []);
const wordCount = computed(() => counted.value.length);
const newCount = computed(() => counted.value.filter((v) => v.state === null).length);
const sortedCards = computed(() => sub.value?.cards ?? []);

const language = computed(() => languageName(me.value?.learningLanguage ?? ""));
const subtitleHint = computed(() =>
  props.data.hasServerSubtitle
    ? `Your media server has a ${language.value} subtitle for this.`
    : me.value?.opensubtitles.connected
      ? `No ${language.value} subtitle on the media server; Learnarr will download one from OpenSubtitles.com with your account.`
      : `No ${language.value} subtitle on the media server. Connect OpenSubtitles.com in Settings → Account to download one.`,
);

// ─── Lemmas ──────────────────────────────────────────────────────────────────

const lemmaFailed = computed(
  () => sub.value?.lemmas.state === "failed" || sub.value?.lemmas.state === "model-failed",
);
const lemmaNote = computed(() => {
  const s = sub.value?.lemmas;
  if (!s) return "";
  switch (s.state) {
    case "done":
      return "Share of the words in this episode you know, counting every time a word is said.";
    case "working":
      return "Finding each word's dictionary form so it can be scored…";
    case "downloading-model":
      return `Downloading the ${language.value} language model${s.percent !== null ? ` (${s.percent}%)` : ""}. This happens once.`;
    case "failed":
    case "model-failed":
      return s.message;
    case "unsupported":
      return `There's no language model for ${language.value} yet, so words are split on spaces and there's no score.`;
    case "no-engine":
      return "The lemmatiser (UDPipe) isn't installed on this server, so there's no score. See System → Status.";
  }
  return "";
});

let poll: ReturnType<typeof setTimeout> | undefined;
async function watchLemmas() {
  clearTimeout(poll);
  const state = sub.value?.lemmas.state;
  if (state !== "working" && state !== "downloading-model") return;
  poll = setTimeout(async () => {
    if (progress.value) await words.load(progress.value.subtitleId);
    watchLemmas();
  }, 3000);
}
onBeforeUnmount(() => clearTimeout(poll));

async function retryLemmas() {
  if (!sub.value) return;
  sub.value.lemmas = (
    await $fetch<{ lemmas: typeof sub.value.lemmas }>(
      `/api/subtitles/${sub.value.subtitle.id}/lemmas/retry`,
      {
        method: "POST",
      },
    )
  ).lemmas;
  watchLemmas();
}

watch(
  () => progress.value?.subtitleId,
  async (id) => {
    selected.value = null;
    if (!id) return;
    await words.load(id);
    watchLemmas();
  },
  { immediate: true },
);

// ─── Getting the subtitle, picking words ─────────────────────────────────────

const fetching = ref(false);
const fetchError = ref("");

async function getSubtitle() {
  fetching.value = true;
  fetchError.value = "";
  try {
    await $fetch(`/api/media/${encodeURIComponent(item.value.id)}/subtitle`, { method: "POST" });
    emit("reload");
  } catch (e) {
    fetchError.value = errorMessage(e);
  } finally {
    fetching.value = false;
  }
}

const count = ref<(typeof COUNTS)[number]>(20);
const picking = ref(false);
const pickMessage = ref("");
const pickOk = ref(false);

async function pick() {
  if (!sub.value) return;
  picking.value = true;
  pickMessage.value = "";
  try {
    const { jobId } = await $fetch<{ jobId: string }>(`/api/subtitles/${sub.value.subtitle.id}/words`, {
      method: "POST",
      body: { count: count.value },
    });
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const job = await $fetch<{ state: string; message: string | null; result: { added: number } | null }>(
        `/api/jobs/${jobId}`,
      );
      if (job.state === "done") {
        const added = job.result?.added ?? 0;
        pickMessage.value = added
          ? `Added ${added} new ${added === 1 ? "card" : "cards"}.`
          : "No new words: you have them all already.";
        pickOk.value = true;
        if (added) tab.value = "cards";
        break;
      }
      if (job.state === "failed") {
        pickMessage.value = job.message ?? "Picking words failed.";
        pickOk.value = false;
        break;
      }
    }
    await words.load(sub.value.subtitle.id);
    useDueCount().refresh();
  } catch (e) {
    pickMessage.value = errorMessage(e);
    pickOk.value = false;
  } finally {
    picking.value = false;
  }
}
</script>

<style scoped>
.head {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.head-poster {
  flex: 0 0 96px;
}

@media (min-width: 700px) {
  .head-poster {
    flex-basis: 140px;
  }
}

.show-link,
.next-link {
  text-decoration: none;
}

.next-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  color: var(--accent-text);
  font-size: 14px;
}

.panel-title {
  font-size: 17px;
  font-weight: 500;
}

.overview {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px 20px;
  align-items: center;
}

.numbers {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  margin: 0;
}

.numbers div {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.numbers dt {
  font-size: 12px;
  color: var(--muted);
}

.numbers dd {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.lemma-note {
  grid-column: 1 / -1;
}

.count {
  min-width: var(--tap);
  min-height: var(--tap);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.count[aria-pressed="true"] {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
  font-weight: 700;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.tab {
  flex: 1;
  min-height: var(--tap);
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--muted);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

@media (min-width: 700px) {
  .tab {
    flex: none;
    padding: 0 20px;
  }
}

.tab[aria-selected="true"] {
  border-bottom-color: var(--accent);
  color: var(--text);
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--tap);
  padding-right: 12px;
}

.toggle input {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
}

.card-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.card-list li + li {
  border-top: 1px solid var(--border);
}
</style>
