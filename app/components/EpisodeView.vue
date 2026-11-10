<template>
  <div class="stack">
    <MediaHeader
      :poster-id="item.type === 'episode' && item.showId ? item.showId : item.id"
      :title="item.type === 'episode' ? `${episodeLabel(item)} · ${item.title}` : item.title"
      :has-poster="item.hasPoster"
    >
      <template #eyebrow>
        <NuxtLink v-if="item.showId" :to="showLink" class="muted plain-link">{{ item.showTitle }}</NuxtLink>
      </template>
      <span v-if="item.year && item.type === 'movie'" class="hint">{{ item.year }}</span>
    </MediaHeader>

    <nav v-if="previous || next" class="episode-nav" :aria-label="$t('episode.episodes')">
      <NuxtLink
        v-if="previous"
        :to="`/media/${previous.id}`"
        class="btn episode-step"
        :aria-label="$t('episode.previousNamed', { episode: stepLabel(previous) })"
      >
        <AppIcon name="back" :size="18" />
        <span class="step-text">{{ stepLabel(previous) }}</span>
      </NuxtLink>
      <span v-else />
      <NuxtLink
        v-if="next"
        :to="`/media/${next.id}`"
        class="btn episode-step episode-step-next"
        :aria-label="$t('episode.nextNamed', { episode: stepLabel(next) })"
      >
        <span class="step-text">{{ stepLabel(next) }}</span>
        <AppIcon name="next" :size="18" />
      </NuxtLink>
    </nav>

    <p v-if="words.error.value" class="notice danger" role="alert">{{ words.error.value }}</p>

    <GetSubtitlePanel
      v-if="!progress"
      :item-id="item.id"
      :has-server-subtitle="data.hasServerSubtitle"
      @ready="emit('reload')"
    />

    <template v-else-if="sub">
      <EpisodeOverview
        :sub="sub"
        :coverage="words.coverage.value"
        :item-id="item.id"
        @retry="words.retryLemmas"
        @replaced="words.load(sub.subtitle.id)"
      />

      <SuggestPanel
        :subtitle-id="sub.subtitle.id"
        :asked="Boolean(sub.subtitle.wordsPickedAt)"
        :has-cards="sub.cards.length > 0"
        @done="words.load(sub.subtitle.id)"
      />

      <SuggestionList
        v-if="sub.suggestions.length"
        :suggestions="sub.suggestions"
        :busy="words.deciding.value"
        @decide="words.decide"
      />

      <div class="tabs" role="tablist" :aria-label="$t('episode.tabsLabel')">
        <button
          v-for="name in TABS"
          :key="name"
          type="button"
          role="tab"
          class="tab"
          :aria-selected="tab === name ? 'true' : 'false'"
          @click="tab = name"
        >
          {{ $t(`episode.tabs.${name}`, { count: sub.cards.length }) }}
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
          <label class="toggle"
            ><input v-model="highlight" type="checkbox" /> {{ $t("transcript.highlight") }}</label
          >
          <label class="toggle"
            ><input v-model="onlyNew" type="checkbox" /> {{ $t("transcript.onlyNew") }}</label
          >
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

      <template v-else>
        <ul v-if="sub.cards.length" class="list-box">
          <li v-for="card in sub.cards" :key="card.id">
            <CardItem :card="card" @updated="(c) => Object.assign(card, c)" />
          </li>
        </ul>
        <p v-else class="muted">{{ $t("episode.noCards") }}</p>
      </template>
    </template>

    <p v-else class="muted">{{ $t("episode.loading") }}</p>

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
      :error="cardError"
      @close="selected = null"
      @known="(known) => words.setKnown(selectedEntry!, known)"
      @card="makeCard"
    />
  </div>
</template>

<script setup lang="ts">
import type { MediaResponse, WordUse } from "~/utils/api";

/**
 * A film or episode: get its subtitle, see how much of it you know, go through
 * suggested words, and browse its words, transcript and cards.
 */
const props = defineProps<{ data: MediaResponse }>();
const emit = defineEmits<{ reload: [] }>();

const TABS = ["words", "transcript", "cards"] as const;

const words = useEpisodeWords();
const sub = words.data;

const item = computed(() => props.data.item);
const next = computed(() => props.data.next);
const previous = computed(() => props.data.previous);

/** "S1 E2 · Desire", the label on the button to a neighbouring episode. */
const stepLabel = (e: NonNullable<typeof next.value>) => `${episodeLabel(e)} · ${e.title}`;
const progress = computed(() => props.data.progress[item.value.id]);
const showLink = computed(() =>
  item.value.seasonId
    ? `/media/${item.value.showId}?season=${item.value.seasonId}`
    : `/media/${item.value.showId}`,
);

const tab = ref<(typeof TABS)[number]>("words");
const highlight = ref(true);
const onlyNew = ref(false);
const selected = ref<{ index: number; use: WordUse | null } | null>(null);
const selectedEntry = computed(() =>
  selected.value ? sub.value?.transcript.vocab[selected.value.index] : undefined,
);
// From the Words tab a word has no tapped line, so the sheet shows its first.
const sheetUse = computed(
  () => selected.value?.use ?? (selected.value ? words.firstUse(selected.value.index) : null),
);
const cardError = ref("");

function select(index: number, use: WordUse | null) {
  selected.value = { index, use };
  cardError.value = "";
}

async function makeCard() {
  if (!selectedEntry.value || !sheetUse.value) return;
  cardError.value = (await words.makeCard(selectedEntry.value, sheetUse.value)) ?? "";
}

watch(
  () => progress.value?.subtitleId,
  (id) => {
    selected.value = null;
    if (id) words.load(id);
  },
  { immediate: true },
);
</script>

<style scoped>
.plain-link {
  text-decoration: none;
}

.episode-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.episode-step {
  min-width: 0;
  justify-content: flex-start;
  gap: 8px;
}

.episode-step-next {
  grid-column: 2;
  justify-content: flex-end;
}

.step-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
