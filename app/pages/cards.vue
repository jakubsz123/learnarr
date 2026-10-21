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
      <li v-for="card in cards" :key="card.id">
        <CardItem :card="card" @updated="(c) => Object.assign(card, c)">
          <div class="item-foot">
            <span class="hint">
              <template v-if="card.source">{{ sourceLabel(card.source) }}</template>
              <template v-if="card.ankiNoteId"> · in Anki</template>
            </span>
            <span class="item-actions">
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
            </span>
          </div>
        </CardItem>
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
import type { Card as ApiCard } from "~/utils/api";

useHead({ title: "Cards · Learnarr" });

type Card = ApiCard & {
  ankiNoteId: number | null;
  source: {
    title: string;
    showTitle: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
  } | null;
};

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

function sourceLabel(source: NonNullable<Card["source"]>) {
  return source.showTitle ? `${source.showTitle} · ${episodeLabel(source)}` : source.title;
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

.list > li + li {
  border-top: 1px solid var(--border);
}

.item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: -4px -8px -8px 0;
}

.item-actions {
  display: flex;
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
