<template>
  <div class="page study">
    <div class="row" style="justify-content: space-between">
      <h1 class="page-title">Study</h1>
      <span v-if="queue.length" class="hint">{{ queue.length }} left · {{ reviewed }} done</span>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <article v-if="card" class="panel flashcard" aria-live="polite">
      <p class="label">{{ revealed ? card.term : "What does the highlighted word mean here?" }}</p>
      <p class="line" :lang="card.language">
        <Sentence :text="card.sentence" :highlight="card.form" />
      </p>

      <div v-if="revealed" class="answer">
        <p class="translation">{{ card.translation }}</p>
        <p class="hint">
          <span v-if="card.partOfSpeech">{{ card.partOfSpeech }}</span>
          <span v-if="card.partOfSpeech && card.note"> · </span>
          <span v-if="card.note">{{ card.note }}</span>
        </p>
      </div>
    </article>

    <div v-if="card" class="actions">
      <button v-if="!revealed" type="button" class="btn btn-primary btn-block big" @click="revealed = true">
        Show answer
      </button>
      <div v-else class="ratings" role="group" aria-label="How well did you know it?">
        <button
          v-for="r in RATINGS"
          :key="r.value"
          type="button"
          class="btn rating"
          :class="r.class"
          :disabled="answering"
          @click="answer(r.value)"
        >
          <span>{{ r.label }}</span>
          <span class="hint">{{ card.intervals[r.value] }}</span>
        </button>
      </div>
    </div>

    <div v-else-if="!loading" class="panel stack done">
      <h2 class="page-title">{{ reviewed ? "Done for now" : "Nothing to study" }}</h2>
      <p class="muted">
        {{
          reviewed
            ? "Cards you just learned come back in a few minutes; the rest when they're due."
            : "Pick words from an episode in the library to make cards."
        }}
      </p>
      <div class="row">
        <button v-if="reviewed" type="button" class="btn" @click="load">Check again</button>
        <NuxtLink to="/library" class="btn btn-primary">Open the library</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: "Study · Learnarr" });

interface StudyCard {
  id: number;
  term: string;
  form: string;
  translation: string;
  partOfSpeech: string | null;
  note: string | null;
  sentence: string;
  language: string;
  intervals: Record<1 | 2 | 3 | 4, string>;
}

const RATINGS = [
  { value: 1, label: "Again", class: "again" },
  { value: 2, label: "Hard", class: "" },
  { value: 3, label: "Good", class: "good" },
  { value: 4, label: "Easy", class: "" },
] as const;

const queue = ref<StudyCard[]>([]);
const card = computed(() => queue.value[0]);
const revealed = ref(false);
const loading = ref(true);
const answering = ref(false);
const reviewed = ref(0);
const error = ref("");

async function load() {
  loading.value = true;
  error.value = "";
  try {
    queue.value = (await $fetch<{ cards: StudyCard[] }>("/api/study")).cards;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function answer(rating: 1 | 2 | 3 | 4) {
  const current = card.value;
  if (!current || answering.value) return;
  answering.value = true;
  try {
    await $fetch(`/api/cards/${current.id}/review`, { method: "POST", body: { rating } });
    reviewed.value++;
    queue.value = queue.value.slice(1);
    revealed.value = false;
    if (!queue.value.length) await load();
    useDueCount().refresh();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    answering.value = false;
  }
}

function onKey(event: KeyboardEvent) {
  if (!card.value || event.target instanceof HTMLInputElement) return;
  if (!revealed.value && (event.key === " " || event.key === "Enter")) {
    event.preventDefault();
    revealed.value = true;
  } else if (revealed.value && ["1", "2", "3", "4"].includes(event.key)) {
    answer(Number(event.key) as 1 | 2 | 3 | 4);
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
  font-size: 22px;
  line-height: 1.45;
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
</style>
