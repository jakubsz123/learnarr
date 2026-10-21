<template>
  <div class="stack">
    <div class="row" role="group" aria-label="Show words">
      <button
        v-for="f in FILTERS"
        :key="f.id"
        type="button"
        class="chip"
        :aria-pressed="filter === f.id ? 'true' : 'false'"
        @click="filter = f.id"
      >
        {{ f.label }} <span class="chip-count">{{ counts[f.id] }}</span>
      </button>
    </div>
    <p class="hint">
      {{
        filter === "new"
          ? "Most common first. Tick the ones you know; tap a word to see it in its line or make a card."
          : filter === "learning"
            ? "Words you have cards for."
            : "Words you know, including the common ones counted as known for your level."
      }}
    </p>
    <ul v-if="shown.length" class="words" :lang="language">
      <li v-for="row in shown" :key="row.index" class="word-row">
        <button type="button" class="word-main" @click="emit('pick', row.index)">
          <span class="word">{{ row.entry.forms[0] ?? row.entry.word }}</span>
          <span v-if="lemmatised && row.entry.word !== row.entry.forms[0]" class="hint">{{
            row.entry.word
          }}</span>
          <span class="hint freq" :class="frequencyBand(row.entry.rank)">{{
            frequencyLabel(row.entry.rank)
          }}</span>
        </button>
        <span class="uses hint">{{ row.entry.count }}×</span>
        <button
          type="button"
          class="tick"
          :aria-pressed="row.entry.state === 'known' ? 'true' : 'false'"
          :aria-label="`${row.entry.state === 'known' ? 'Known' : 'Mark as known'}: ${row.entry.word}`"
          @click="emit('known', row.index, row.entry.state !== 'known')"
        >
          <AppIcon name="check" :size="20" />
        </button>
      </li>
    </ul>
    <p v-else class="muted">Nothing here.</p>
    <button v-if="visible < filtered.length" type="button" class="btn btn-block" @click="visible += PAGE">
      Show more ({{ filtered.length - visible }} left)
    </button>
  </div>
</template>

<script setup lang="ts">
import { frequencyBand, frequencyLabel } from "#shared/frequency";
import type { VocabEntry } from "~/utils/api";

const props = defineProps<{ vocab: VocabEntry[]; language: string; lemmatised: boolean }>();
const emit = defineEmits<{ pick: [index: number]; known: [index: number, known: boolean] }>();

const FILTERS = [
  { id: "new", label: "New" },
  { id: "learning", label: "Learning" },
  { id: "known", label: "Known" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const PAGE = 60;
const filter = ref<Filter>("new");
const visible = ref(PAGE);

// Names and numbers don't count towards "% you know", so they're not listed as words to learn.
const rows = computed(() =>
  props.vocab.map((entry, index) => ({ entry, index })).filter((r) => r.entry.count > 0),
);
const group = (entry: VocabEntry): Filter => entry.state ?? "new";

// The list keeps its order while you tick words, so a ticked word doesn't jump away under your finger.
const order = ref<number[]>([]);
watch(
  [() => props.vocab, filter],
  () => {
    order.value = rows.value
      .filter((r) => group(r.entry) === filter.value)
      .toSorted((a, b) => (a.entry.rank ?? 1e9) - (b.entry.rank ?? 1e9) || b.entry.count - a.entry.count)
      .map((r) => r.index);
    visible.value = PAGE;
  },
  { immediate: true },
);
const filtered = computed(() => order.value.map((index) => ({ index, entry: props.vocab[index]! })));
const shown = computed(() => filtered.value.slice(0, visible.value));
const counts = computed(() => {
  const c: Record<Filter, number> = { new: 0, learning: 0, known: 0 };
  for (const r of rows.value) c[group(r.entry)]++;
  return c;
});
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.chip[aria-pressed="true"] {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
}

.chip-count {
  color: var(--muted);
  font-size: 13px;
}

.words {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.word-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  border-bottom: 1px solid var(--border);
}

.word-row:last-child {
  border-bottom: 0;
}

.word-main {
  flex: 1;
  min-width: 0;
  min-height: 52px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 10px;
  padding: 6px 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.word {
  font-size: 16px;
  font-weight: 500;
}

.freq.top,
.freq.common {
  color: var(--accent-text);
}

.uses {
  font-variant-numeric: tabular-nums;
}

.tick {
  flex: none;
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-left: 1px solid var(--border);
  background: none;
  color: var(--border);
  cursor: pointer;
}

.tick[aria-pressed="true"] {
  color: var(--ok);
}
</style>
