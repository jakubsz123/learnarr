<template>
  <div class="page">
    <div class="row" style="justify-content: space-between">
      <h1 class="page-title">Cards</h1>
      <button v-if="pending.length" type="button" class="btn" :disabled="sending" @click="sendToAnki">
        <AppIcon name="anki" :size="18" />
        {{ sending ? "Sending…" : `Send ${pending.length} to Anki` }}
      </button>
    </div>
    <p v-if="ankiMessage" :class="ankiOk ? 'ok' : 'danger'" role="status">{{ ankiMessage }}</p>

    <div class="section">
      <label class="search">
        <span class="sr-only">Search cards</span>
        <AppIcon name="search" :size="18" />
        <input v-model="search" class="input" type="search" placeholder="Search words or translations" />
      </label>
      <div class="filters" role="group" aria-label="Show">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          class="filter"
          :aria-pressed="filter === f.value ? 'true' : 'false'"
          @click="filter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <ul v-if="cards.length" class="list">
      <li v-for="card in cards" :key="card.id" class="item" :class="{ suspended: card.suspended }">
        <div class="item-main">
          <span class="term">{{ card.term }}</span>
          <span class="muted"> · {{ card.translation }}</span>
          <Sentence :text="card.sentence" :highlight="card.form" class="hint sentence" />
          <span class="hint">
            {{ stateLabel(card) }}<template v-if="card.source"> · {{ sourceLabel(card.source) }}</template>
            <template v-if="card.ankiNoteId"> · in Anki</template>
          </span>
        </div>
        <div class="item-actions">
          <button
            type="button"
            class="icon-btn"
            :aria-label="card.suspended ? `Resume ${card.term}` : `Suspend ${card.term}`"
            :title="card.suspended ? 'Resume' : 'Suspend'"
            @click="toggleSuspend(card)"
          >
            <AppIcon :name="card.suspended ? 'play' : 'pause'" :size="18" />
          </button>
          <button
            type="button"
            class="icon-btn danger"
            :aria-label="`Delete ${card.term}`"
            title="Delete"
            @click="remove(card)"
          >
            <AppIcon name="trash" :size="18" />
          </button>
        </div>
      </li>
    </ul>
    <p v-else-if="!loading" class="muted">
      {{
        search || filter !== "all"
          ? "No cards match."
          : "No cards yet. Pick words from an episode in the library."
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { AnkiCard } from "~/composables/useAnki";

useHead({ title: "Cards · Learnarr" });

interface Card {
  id: number;
  term: string;
  form: string;
  translation: string;
  sentence: string;
  state: "new" | "learning" | "review";
  due: string;
  suspended: boolean;
  ankiNoteId: number | null;
  source: {
    title: string;
    showTitle: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
  } | null;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "review", label: "Review" },
  { value: "suspended", label: "Suspended" },
] as const;

const { me } = useMe();
const cards = ref<Card[]>([]);
const search = ref("");
const filter = ref<(typeof FILTERS)[number]["value"]>("all");
const loading = ref(true);
const error = ref("");
const pending = ref<AnkiCard[]>([]);
const sending = ref(false);
const ankiMessage = ref("");
const ankiOk = ref(false);

function stateLabel(card: Card) {
  if (card.suspended) return "Suspended";
  if (card.state === "new") return "New";
  const due = new Date(card.due);
  if (due.getTime() <= Date.now()) return "Due now";
  return `Next ${due.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

function sourceLabel(source: NonNullable<Card["source"]>) {
  if (source.showTitle)
    return `${source.showTitle} S${source.seasonNumber ?? "?"}E${source.episodeNumber ?? "?"}`;
  return source.title;
}

async function load() {
  loading.value = true;
  try {
    const query = { search: search.value || undefined, filter: filter.value };
    cards.value = (await $fetch<{ cards: Card[] }>("/api/cards", { query })).cards;
    pending.value = (await $fetch<{ cards: AnkiCard[] }>("/api/cards/anki")).cards;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function toggleSuspend(card: Card) {
  try {
    await $fetch(`/api/cards/${card.id}`, { method: "PATCH", body: { suspended: !card.suspended } });
    card.suspended = !card.suspended;
  } catch (e) {
    error.value = errorMessage(e);
  }
}

async function remove(card: Card) {
  if (!window.confirm(`Delete "${card.term}"?`)) return;
  try {
    await $fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    cards.value = cards.value.filter((c) => c.id !== card.id);
    pending.value = pending.value.filter((c) => c.id !== card.id);
  } catch (e) {
    error.value = errorMessage(e);
  }
}

async function sendToAnki() {
  if (!me.value) return;
  sending.value = true;
  ankiMessage.value = "";
  try {
    const added = await useAnki().push(me.value.anki.url, me.value.anki.deck, pending.value);
    ankiMessage.value = `Sent ${added} ${added === 1 ? "card" : "cards"} to the "${me.value.anki.deck}" deck.`;
    ankiOk.value = true;
    await load();
  } catch (e) {
    ankiMessage.value = errorMessage(e);
    ankiOk.value = false;
  } finally {
    sending.value = false;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
});
watch(filter, load);
onMounted(load);
</script>

<style scoped>
.search {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 420px;
  color: var(--muted);
}

.search svg {
  position: absolute;
  left: 12px;
}

.search .input {
  padding-left: 38px;
}

.filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.filter {
  flex: none;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.filter[aria-pressed="true"] {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
  font-weight: 500;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.item {
  display: flex;
  gap: 8px;
  padding: 10px 8px 10px 12px;
  border-bottom: 1px solid var(--border);
}

.item:last-child {
  border-bottom: 0;
}

.item.suspended .item-main {
  opacity: 0.6;
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.term {
  font-weight: 500;
}

.item-actions {
  display: flex;
  align-items: flex-start;
}

.icon-btn {
  width: var(--tap);
  height: var(--tap);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.icon-btn.danger {
  color: var(--danger);
}
</style>
