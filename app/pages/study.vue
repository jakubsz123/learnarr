<template>
  <div class="page study">
    <div class="row-between">
      <h1 class="page-title">{{ $t("nav.study") }}</h1>
      <span v-if="queue.length" class="hint">{{
        $t("study.progress", { left: queue.length, done: reviewed })
      }}</span>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <article v-if="card" class="panel flashcard" aria-live="polite">
      <span class="kind" :class="card.state">{{
        card.state === "new" ? $t("study.newWord") : $t("study.review")
      }}</span>
      <p class="line" :lang="card.language"><Sentence :text="card.sentence" :highlight="card.form" /></p>
      <p v-if="!revealed" class="label">{{ $t("study.question", { word: card.form }) }}</p>

      <div v-else class="answer">
        <p class="term" :lang="card.language">{{ card.term }}</p>
        <TranslationEdit
          :key="card.id"
          class="translation"
          :card="card"
          @saved="(text) => (card!.translation = text)"
        />
        <p v-if="card.partOfSpeech || card.note" class="hint">
          {{ [card.partOfSpeech, card.note].filter(Boolean).join(" · ") }}
        </p>
      </div>
      <NuxtLink v-if="card.source" :to="`/media/${card.source.serverItemId}`" class="source hint">
        {{ mediaTitle(card.source) }}
      </NuxtLink>
    </article>

    <div v-if="card" class="actions">
      <button v-if="!revealed" type="button" class="btn btn-primary btn-block big" @click="revealed = true">
        {{ $t("study.showAnswer") }}
      </button>
      <div v-else class="ratings" role="group" :aria-label="$t('study.howWell')">
        <button
          v-for="(value, name) in RATINGS"
          :key="value"
          type="button"
          class="btn rating"
          :class="name"
          :disabled="answering"
          @click="answer(value)"
        >
          <span>{{ $t(`study.ratings.${name}`) }}</span>
          <span class="hint">{{ intervalText(card.intervals[value]) }}</span>
        </button>
      </div>
    </div>

    <div v-else-if="!loading" class="panel stack done">
      <h2 class="page-title">{{ reviewed ? $t("study.doneTitle") : $t("study.emptyTitle") }}</h2>
      <p class="muted">{{ reviewed ? $t("study.doneText") : $t("study.emptyText") }}</p>
      <div class="row">
        <button v-if="reviewed" type="button" class="btn" @click="load">{{ $t("study.checkAgain") }}</button>
        <NuxtLink to="/library" class="btn btn-primary">{{ $t("setup.done.library") }}</NuxtLink>
      </div>
    </div>

    <div v-if="last" class="undo-bar">
      <span class="hint">{{ last.card.term }}: {{ $t(`study.ratings.${ratingName(last.rating)}`) }}</span>
      <button type="button" class="btn" :disabled="answering" @click="undo">
        <AppIcon name="undo" :size="18" /> {{ $t("study.undo") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RATINGS, type IntervalUnit, type Rating } from "#shared/srs";
import type { StudyCard } from "~/utils/api";

const { t } = useI18n();
useHead({ title: () => `${t("nav.study")} · Learnarr` });

const { errorText } = useErrorMessage();
const queue = ref<StudyCard[]>([]);
const card = computed(() => queue.value[0]);
const revealed = ref(false);
const loading = ref(true);
const answering = ref(false);
const reviewed = ref(0);
const error = ref("");
const last = ref<{ card: StudyCard; rating: Rating } | null>(null);

const ratingName = (rating: Rating) =>
  (Object.keys(RATINGS) as (keyof typeof RATINGS)[]).find((k) => RATINGS[k] === rating)!;

/** "10 min", "3 d": the server's interval, in words for the reader. */
function intervalText(interval: { value: number; unit: IntervalUnit }) {
  return t(`study.intervals.${interval.unit}`, { count: interval.value });
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    queue.value = (await api<{ cards: StudyCard[] }>("/api/study")).cards;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}

async function answer(rating: Rating) {
  const current = card.value;
  if (!current || answering.value) return;
  answering.value = true;
  try {
    await api(`/api/cards/${current.id}/review`, { method: "POST", body: { rating } });
    reviewed.value++;
    last.value = { card: current, rating };
    queue.value = queue.value.slice(1);
    revealed.value = false;
    if (!queue.value.length) await load();
    useDueCount().refresh();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    answering.value = false;
  }
}

/** Take the last answer back and show that card again. */
async function undo() {
  const previous = last.value;
  if (!previous || answering.value) return;
  answering.value = true;
  try {
    await api(`/api/cards/${previous.card.id}/undo`, { method: "POST" });
    queue.value = [previous.card, ...queue.value.filter((c) => c.id !== previous.card.id)];
    reviewed.value--;
    revealed.value = true;
    last.value = null;
    useDueCount().refresh();
  } catch (e) {
    error.value = errorText(e);
  } finally {
    answering.value = false;
  }
}

function onKey(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === "u" || ((event.ctrlKey || event.metaKey) && event.key === "z")) {
    event.preventDefault();
    undo();
    return;
  }
  if (!card.value) return;
  if (!revealed.value && (event.key === " " || event.key === "Enter")) {
    event.preventDefault();
    revealed.value = true;
  } else if (revealed.value && ["1", "2", "3", "4"].includes(event.key)) {
    answer(Number(event.key) as Rating);
  }
}

onMounted(() => {
  load();
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<style scoped>
.study {
  max-width: 640px;
}

.flashcard {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  padding: 24px 20px;
  text-align: center;
}

.label {
  color: var(--muted);
  font-size: 15px;
}

.line {
  font-family: var(--font-sentence);
  font-size: clamp(24px, 5vw, 30px);
  line-height: 1.4;
  text-wrap: balance;
}

.answer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.translation {
  font-size: 20px;
  font-weight: 500;
}

.actions {
  position: sticky;
  bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 12px);
}

@media (min-width: 900px) {
  .actions {
    bottom: 16px;
  }
}

.big {
  min-height: 56px;
  font-size: 17px;
}

.ratings {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.rating {
  flex-direction: column;
  gap: 0;
  min-height: 60px;
  padding: 6px 4px;
}

.rating.again {
  color: var(--danger);
}

.rating.good {
  border-color: var(--accent);
}

.done {
  align-items: flex-start;
}

.kind {
  align-self: center;
  padding: 2px 10px;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12px;
}

.kind.new {
  color: var(--accent-text);
}

.term {
  font-size: 17px;
  color: var(--muted);
}

.source {
  align-self: center;
  text-decoration: none;
}

.undo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
