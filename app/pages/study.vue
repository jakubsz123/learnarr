<template>
  <div class="page study">
    <div class="row" style="justify-content: space-between">
      <h1 class="page-title">Study</h1>
      <span v-if="queue.length" class="hint">{{ queue.length }} left · {{ reviewed }} done</span>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <article v-if="card" class="panel flashcard" aria-live="polite">
      <span class="kind" :class="card.state">{{ card.state === "new" ? "New word" : "Review" }}</span>
      <p class="line" :lang="card.language">
        <Sentence :text="card.sentence" :highlight="card.form" />
      </p>
      <p v-if="!revealed" class="label">What does “{{ card.form }}” mean here?</p>

      <div v-else class="answer">
        <p class="term" :lang="card.language">{{ card.term }}</p>
        <form v-if="editing" class="edit" @submit.prevent="saveEdit">
          <label class="sr-only" for="edit-translation">Translation</label>
          <input
            id="edit-translation"
            ref="editInput"
            v-model.trim="draft"
            class="input"
            maxlength="200"
            required
          />
          <button type="submit" class="btn btn-primary">Save</button>
        </form>
        <p v-else class="translation">
          {{ card.translation }}
          <button
            type="button"
            class="edit-btn"
            aria-label="Edit the translation"
            title="Edit"
            @click="startEdit"
          >
            <AppIcon name="edit" :size="16" />
          </button>
        </p>
        <p v-if="card.partOfSpeech || card.note" class="hint">
          {{ [card.partOfSpeech, card.note].filter(Boolean).join(" · ") }}
        </p>
      </div>
      <NuxtLink v-if="card.source" :to="`/media/${card.source.serverItemId}`" class="source hint">
        {{ sourceLabel(card.source) }}
      </NuxtLink>
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

    <div v-if="last" class="undo-bar">
      <span class="hint"
        >{{ last.card.term }}: {{ RATINGS.find((r) => r.value === last!.rating)?.label }}</span
      >
      <button type="button" class="btn" :disabled="answering" @click="undo">
        <AppIcon name="undo" :size="18" /> Undo
      </button>
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
  state: "new" | "learning" | "review";
  source: {
    serverItemId: string;
    title: string;
    showTitle: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
  } | null;
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
const last = ref<{ card: StudyCard; rating: 1 | 2 | 3 | 4 } | null>(null);
const editing = ref(false);
const draft = ref("");
const editInput = ref<HTMLInputElement | null>(null);

const sourceLabel = (s: NonNullable<StudyCard["source"]>) =>
  s.showTitle ? `${s.showTitle} · ${episodeLabel(s)}` : s.title;

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
    last.value = { card: current, rating };
    queue.value = queue.value.slice(1);
    revealed.value = false;
    editing.value = false;
    if (!queue.value.length) await load();
    useDueCount().refresh();
  } catch (e) {
    error.value = errorMessage(e);
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
    await $fetch(`/api/cards/${previous.card.id}/undo`, { method: "POST" });
    queue.value = [previous.card, ...queue.value.filter((c) => c.id !== previous.card.id)];
    reviewed.value--;
    revealed.value = true;
    last.value = null;
    useDueCount().refresh();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    answering.value = false;
  }
}

async function startEdit() {
  if (!card.value) return;
  draft.value = card.value.translation;
  editing.value = true;
  await nextTick();
  editInput.value?.focus();
}

async function saveEdit() {
  const current = card.value;
  if (!current || !draft.value) return;
  try {
    await $fetch(`/api/cards/${current.id}`, { method: "PATCH", body: { translation: draft.value } });
    current.translation = draft.value;
    editing.value = false;
  } catch (e) {
    error.value = errorMessage(e);
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

.edit {
  display: flex;
  gap: 8px;
}

.edit-btn {
  width: 32px;
  height: 32px;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius);
  background: none;
  color: var(--muted);
  cursor: pointer;
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
