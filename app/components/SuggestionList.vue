<template>
  <section class="panel stack">
    <div class="row" style="justify-content: space-between">
      <h2 class="panel-title">
        {{ suggestions.length }} suggested {{ suggestions.length === 1 ? "word" : "words" }}
      </h2>
      <button type="button" class="btn btn-primary" :disabled="busy" @click="emit('decide', allIds, 'learn')">
        Learn all
      </button>
    </div>
    <p class="hint">
      Learn the ones you want to study. Words you already know are marked known and won't be suggested again.
    </p>
    <ul class="list">
      <li v-for="s in suggestions" :key="s.id" class="item">
        <div class="text">
          <p>
            <span class="term" :lang="s.language">{{ s.term }}</span>
            <span class="muted"> · {{ s.translation }}</span>
          </p>
          <p class="sentence" :lang="s.language"><Sentence :text="s.sentence" :highlight="s.form" /></p>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy"
            @click="emit('decide', [s.id], 'learn')"
          >
            Learn
          </button>
          <button type="button" class="btn" :disabled="busy" @click="emit('decide', [s.id], 'know')">
            I know it
          </button>
          <button
            type="button"
            class="btn icon-btn"
            :disabled="busy"
            :aria-label="`Skip ${s.term}`"
            title="Skip"
            @click="emit('decide', [s.id], 'skip')"
          >
            <AppIcon name="x" :size="18" />
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { Decision, Suggestion } from "~/utils/api";

const props = defineProps<{ suggestions: Suggestion[]; busy: boolean }>();
const allIds = computed(() => props.suggestions.map((s) => s.id));
const emit = defineEmits<{ decide: [ids: number[], decision: Decision] }>();
</script>

<style scoped>
.list {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: grid;
  gap: 8px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.term {
  font-size: 17px;
  font-weight: 500;
}

.sentence {
  color: var(--muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  margin-left: auto;
  padding-inline: 10px;
}
</style>
