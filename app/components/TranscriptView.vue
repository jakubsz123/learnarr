<template>
  <div class="transcript" :class="{ highlight }" :lang="language">
    <p v-if="!shownLines.length" class="muted">No lines with new words. You know everything here.</p>
    <ol class="lines">
      <li v-for="line in shownLines" :key="line.cue" class="line">
        <span class="time">{{ timestamp(line.startMs) }}</span>
        <span class="text">
          <template v-for="(part, i) in line.parts" :key="i">
            <button
              v-if="part.vocab !== undefined"
              type="button"
              class="w"
              :class="[stateClass(part.vocab), { picked: part.vocab === selected }]"
              @click="emit('pick', part.vocab, { cue: line.cue, start: part.start, end: part.end })"
            >
              {{ part.text }}
            </button>
            <template v-else>{{ part.text }}</template>
          </template>
        </span>
      </li>
    </ol>
    <button v-if="visible < lines.length" type="button" class="btn btn-block" @click="visible += PAGE">
      Show more lines ({{ lines.length - visible }} left)
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Cue, Transcript, WordUse } from "~/utils/api";

const props = defineProps<{
  cues: Cue[];
  transcript: Transcript;
  language: string;
  highlight: boolean;
  onlyNew: boolean;
  selected: number | null;
}>();
const emit = defineEmits<{ pick: [vocab: number, use: WordUse] }>();

/** A long film has well over a thousand lines; render them a page at a time. */
const PAGE = 150;
const visible = ref(PAGE);

const isNew = (vocab: number) => {
  const entry = props.transcript.vocab[vocab];
  return !!entry && entry.state === null && entry.count > 0;
};

const lines = computed(() =>
  props.cues
    .map((cue, i) => ({
      cue: i,
      startMs: cue.startMs,
      text: cue.text,
      words: props.transcript.lines[i] ?? [],
    }))
    .filter((line) => !props.onlyNew || line.words.some((w) => isNew(w[2]))),
);

const shownLines = computed(() =>
  lines.value.slice(0, visible.value).map((line) => {
    const parts: { text: string; vocab?: number; start: number; end: number }[] = [];
    let at = 0;
    for (const [start, end, vocab] of line.words) {
      if (start < at) continue; // the second word of a contraction shares the first one's text
      if (start > at) parts.push({ text: line.text.slice(at, start), start: at, end: start });
      parts.push({ text: line.text.slice(start, end), vocab, start, end });
      at = end;
    }
    if (at < line.text.length) parts.push({ text: line.text.slice(at), start: at, end: line.text.length });
    return { ...line, parts };
  }),
);

function stateClass(vocab: number) {
  const entry = props.transcript.vocab[vocab];
  if (!entry || entry.state === "known") return "known";
  if (entry.state === "learning") return "learning";
  return entry.count > 0 ? "new" : "known";
}

watch(
  () => props.onlyNew,
  () => (visible.value = PAGE),
);
</script>

<style scoped>
.lines {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.line {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.time {
  padding-top: 3px;
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.text {
  font-size: 17px;
  line-height: 1.7;
  white-space: pre-line;
}

.w {
  padding: 1px 0;
  border: 0;
  border-radius: 3px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
}

.highlight .w.new {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}

.highlight .w.learning {
  text-decoration: underline 2px var(--warn);
  text-underline-offset: 4px;
}

.w.picked {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
</style>
