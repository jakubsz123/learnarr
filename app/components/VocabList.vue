<template>
  <div class="stack">
    <div class="pills" role="group" :aria-label="$t('words.show')">
      <button
        v-for="f in FILTERS"
        :key="f"
        type="button"
        class="pill"
        :aria-pressed="filter === f ? 'true' : 'false'"
        @click="filter = f"
      >
        {{ $t(`words.filters.${f}`) }} <span class="pill-count">{{ counts[f] }}</span>
      </button>
    </div>
    <p class="hint">{{ $t(`words.hints.${filter}`) }}</p>
    <ul v-if="shown.length" class="list-box" :lang="language">
      <li v-for="row in shown" :key="row.index" class="word-row">
        <button type="button" class="word-main" @click="emit('pick', row.index)">
          <span class="word">{{ row.entry.forms[0] ?? row.entry.word }}</span>
          <span v-if="lemmatised && row.entry.word !== row.entry.forms[0]" class="hint">{{
            row.entry.word
          }}</span>
          <span class="hint freq" :class="frequencyBand(row.entry.rank)">{{
            frequencyText(row.entry.rank)
          }}</span>
        </button>
        <span class="uses hint">{{ $t("words.uses", { count: row.entry.count }) }}</span>
        <button
          type="button"
          class="tick"
          :aria-pressed="row.entry.state === 'known' ? 'true' : 'false'"
          :aria-label="
            $t(row.entry.state === 'known' ? 'words.knownNamed' : 'words.markKnownNamed', {
              word: row.entry.word,
            })
          "
          @click="emit('known', row.index, row.entry.state !== 'known')"
        >
          <AppIcon name="check" :size="20" />
        </button>
      </li>
    </ul>
    <p v-else class="muted">{{ $t("words.nothing") }}</p>
    <button v-if="visible < filtered.length" type="button" class="btn btn-block" @click="visible += PAGE">
      {{ $t("words.showMore", { count: filtered.length - visible }) }}
    </button>
  </div>
</template>

<script setup lang="ts">
/** An episode's words, new ones most common first, with a tick to mark each known. */
import { frequencyBand } from "#shared/frequency";
import type { VocabEntry } from "~/utils/api";

const props = defineProps<{ vocab: VocabEntry[]; language: string; lemmatised: boolean }>();
const emit = defineEmits<{ pick: [index: number]; known: [index: number, known: boolean] }>();

const FILTERS = ["new", "learning", "known"] as const;
type Filter = (typeof FILTERS)[number];

const { frequencyText } = useFrequencyText();

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
.word-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
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
