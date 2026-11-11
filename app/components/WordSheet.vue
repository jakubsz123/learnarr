<template>
  <aside
    class="sheet panel"
    role="dialog"
    aria-modal="false"
    :aria-label="$t('wordSheet.label', { word: shown })"
  >
    <div class="sheet-head">
      <div class="stack-tight">
        <span class="word" :lang="language">{{ shown }}</span>
        <span v-if="dictionaryForm" class="hint" :lang="language">{{
          $t("wordSheet.from", { word: dictionaryForm })
        }}</span>
      </div>
      <button
        ref="closeButton"
        type="button"
        class="icon-btn close"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      >
        <AppIcon name="x" />
      </button>
    </div>

    <div class="row facts">
      <span class="fact" :class="`state-${entry.state ?? 'new'}`">{{
        $t(`wordSheet.state.${entry.state ?? "new"}`)
      }}</span>
      <span class="fact">{{ frequencyText(entry.rank) }}</span>
      <span v-if="entry.count > 1" class="fact">{{ $t("wordSheet.usesHere", { count: entry.count }) }}</span>
    </div>

    <p v-if="line" class="line" :lang="language"><Sentence :text="line" :highlight="usedForm" /></p>

    <div v-if="card" class="stack-tight">
      <p class="translation">{{ card.translation }}</p>
      <p v-if="card.note || card.partOfSpeech" class="hint">
        {{ [card.partOfSpeech, card.note].filter(Boolean).join(" · ") }}
      </p>
      <p class="hint">
        {{ card.term === shown ? $t("wordSheet.inCards") : $t("wordSheet.inCardsAs", { term: card.term }) }}
      </p>
    </div>

    <details class="dictionary" @toggle="lookUp">
      <summary>{{ $t("wordSheet.dictionary") }}</summary>
      <p v-if="definitions === null" class="hint">{{ $t("common.loading") }}</p>
      <p v-else-if="!definitions.reached" class="hint">{{ $t("wordSheet.dictionaryOffline") }}</p>
      <p v-else-if="!definitions.entries.length" class="hint">{{ $t("wordSheet.dictionaryNothing") }}</p>
      <div v-for="(d, i) in definitions?.entries ?? []" :key="i" class="definition">
        <p class="hint">
          {{ d.partOfSpeech
          }}<template v-if="d.formOf"> · {{ $t("wordSheet.formOf", { word: d.formOf }) }}</template>
        </p>
        <ol>
          <li v-for="(text, j) in d.definitions" :key="j">{{ text }}</li>
        </ol>
      </div>
      <a
        v-if="definitions?.reached"
        class="hint"
        :href="`https://en.wiktionary.org/wiki/${encodeURIComponent(definitions.word ?? entry.word)}`"
        target="_blank"
        rel="noopener"
      >
        Wiktionary
      </a>
    </details>

    <div class="actions">
      <button
        type="button"
        class="btn"
        :class="{ 'is-on': entry.state === 'known' }"
        :aria-pressed="entry.state === 'known' ? 'true' : 'false'"
        @click="emit('known', entry.state !== 'known')"
      >
        <AppIcon name="check" :size="18" />
        {{ entry.state === "known" ? $t("wordSheet.known") : $t("wordSheet.iKnow") }}
      </button>
      <button
        v-if="!card"
        type="button"
        class="btn btn-primary"
        :disabled="busy || !canCard"
        @click="emit('card')"
      >
        <AppIcon name="plus" :size="18" /> {{ busy ? $t("wordSheet.asking") : $t("wordSheet.makeCard") }}
      </button>
    </div>
    <p v-if="error" class="hint danger" role="alert">{{ error }}</p>
  </aside>
</template>

<script setup lang="ts">
import type { Card, Get, VocabEntry } from "~/utils/api";

/**
 * A tapped word: its dictionary form, how common it is, the line, its card or
 * a definition, and the two things to do with it. A sheet at the bottom of a
 * phone, a panel in the corner of a wider screen; Escape closes it.
 */
const props = defineProps<{
  entry: VocabEntry;
  /** The form as used where it was tapped. */
  usedForm?: string;
  line?: string;
  card?: Card;
  lemmatised: boolean;
  language: string;
  busy: boolean;
  canCard: boolean;
  error?: string;
}>();
const emit = defineEmits<{ close: []; known: [known: boolean]; card: [] }>();

const { frequencyText } = useFrequencyText();
const shown = computed(() => props.usedForm || props.entry.forms[0] || props.entry.word);
const dictionaryForm = computed(() =>
  props.lemmatised && props.entry.word !== shown.value.toLocaleLowerCase() ? props.entry.word : "",
);

const definitions = ref<Get<"/api/dictionary"> | null>(null);
async function lookUp(event: Event) {
  if (!(event.target as HTMLDetailsElement).open || definitions.value) return;
  const words = [props.entry.word, ...props.entry.forms].slice(0, 3).join(",");
  definitions.value = await api<Definitions>("/api/dictionary", {
    query: { language: props.language, words },
  }).catch(() => ({
    reached: false,
    word: props.entry.word,
    entries: [],
  }));
}
watch(
  () => props.entry,
  () => (definitions.value = null),
);

const closeButton = ref<HTMLButtonElement | null>(null);
function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}
onMounted(() => {
  closeButton.value?.focus({ preventScroll: true });
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<style scoped>
.sheet {
  position: fixed;
  z-index: 30;
  left: 8px;
  right: 8px;
  bottom: calc(var(--tabbar-h) + 8px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: var(--shadow-raised);
}

@media (min-width: 900px) {
  .sheet {
    left: auto;
    right: 24px;
    bottom: 24px;
    width: 380px;
  }
}

.sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.word {
  font-size: 24px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.close {
  margin: -8px -8px 0 0;
}

.facts {
  gap: 6px;
}

.fact {
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--surface-2);
  font-size: 13px;
  color: var(--muted);
}

.fact.state-new {
  color: var(--accent-text);
}

.fact.state-learning {
  color: var(--warn);
}

.fact.state-known {
  color: var(--ok);
}

.line {
  padding: 10px 12px;
  background: var(--surface-2);
  border-radius: var(--radius);
}

.translation {
  font-size: 18px;
}

.dictionary summary {
  min-height: 36px;
  display: flex;
  align-items: center;
  color: var(--muted);
  cursor: pointer;
}

.definition ol {
  margin: 4px 0 8px;
  padding-left: 20px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.actions .btn:only-child {
  grid-column: span 2;
}

.btn.is-on {
  border-color: var(--ok);
  color: var(--ok);
}
</style>
