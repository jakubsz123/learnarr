<template>
  <aside class="sheet panel" role="dialog" aria-modal="false" :aria-label="`The word ${shown}`">
    <div class="sheet-head">
      <div class="stack" style="gap: 2px; min-width: 0">
        <span class="word" :lang="language">{{ shown }}</span>
        <span v-if="dictionaryForm" class="hint" :lang="language">from {{ dictionaryForm }}</span>
      </div>
      <button ref="closeButton" type="button" class="icon-close" aria-label="Close" @click="emit('close')">
        <AppIcon name="x" />
      </button>
    </div>

    <div class="row facts">
      <span class="fact" :class="stateClass">{{ stateLabel }}</span>
      <span class="fact">{{ frequencyLabel(entry.rank) }}</span>
      <span v-if="entry.count > 1" class="fact">{{ entry.count }}× here</span>
    </div>

    <p v-if="line" class="line" :lang="language"><Sentence :text="line" :highlight="usedForm" /></p>

    <div v-if="card" class="card-answer">
      <p class="translation">{{ card.translation }}</p>
      <p v-if="card.note || card.partOfSpeech" class="hint">
        {{ [card.partOfSpeech, card.note].filter(Boolean).join(" · ") }}
      </p>
      <p class="hint">
        {{ card.term === shown ? "In your cards." : `In your cards as “${card.term}”.` }}
      </p>
    </div>

    <div class="actions">
      <button
        type="button"
        class="btn"
        :class="{ 'is-on': entry.state === 'known' }"
        :aria-pressed="entry.state === 'known' ? 'true' : 'false'"
        @click="emit('known', entry.state !== 'known')"
      >
        <AppIcon name="check" :size="18" /> {{ entry.state === "known" ? "Known" : "I know this" }}
      </button>
      <button
        v-if="!card"
        type="button"
        class="btn btn-primary"
        :disabled="busy || !canCard"
        @click="emit('card')"
      >
        <AppIcon name="plus" :size="18" /> {{ busy ? "Asking the AI…" : "Make a card" }}
      </button>
    </div>
    <p v-if="error" class="hint danger" role="alert">{{ error }}</p>
  </aside>
</template>

<script setup lang="ts">
import { frequencyLabel } from "#shared/frequency";
import type { Card, VocabEntry } from "~/utils/api";

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

const shown = computed(() => props.usedForm || props.entry.forms[0] || props.entry.word);
const dictionaryForm = computed(() =>
  props.lemmatised && props.entry.word !== shown.value.toLocaleLowerCase() ? props.entry.word : "",
);
const stateLabel = computed(() =>
  props.entry.state === "known" ? "Known" : props.entry.state === "learning" ? "Learning" : "New to you",
);
const stateClass = computed(() => `state-${props.entry.state ?? "new"}`);

const closeButton = ref<HTMLButtonElement | null>(null);
onMounted(() => closeButton.value?.focus({ preventScroll: true }));

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}
onMounted(() => window.addEventListener("keydown", onKey));
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
  box-shadow: 0 8px 32px rgb(0 0 0 / 30%);
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

.icon-close {
  flex: none;
  width: var(--tap);
  height: var(--tap);
  margin: -8px -8px 0 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
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
  border-left: 3px solid var(--accent);
  background: var(--surface-2);
  border-radius: var(--radius);
}

.translation {
  font-size: 18px;
}

.card-answer {
  display: grid;
  gap: 2px;
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
