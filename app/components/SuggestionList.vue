<template>
  <section class="panel stack">
    <div class="row-between">
      <h2 class="panel-title">{{ $t("suggestions.title", { count: suggestions.length }) }}</h2>
      <button type="button" class="btn btn-primary" :disabled="busy" @click="emit('decide', allIds, 'learn')">
        {{ $t("suggestions.learnAll") }}
      </button>
    </div>
    <p class="hint">{{ $t("suggestions.intro") }}</p>
    <ul class="items">
      <li v-for="s in suggestions" :key="s.id" class="item">
        <p>
          <span class="term" :lang="s.language">{{ s.term }}</span>
          <span class="muted"> · {{ s.translation }}</span>
        </p>
        <p class="sentence" :lang="s.language"><Sentence :text="s.sentence" :highlight="s.form" /></p>
        <div class="actions">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="busy"
            @click="emit('decide', [s.id], 'learn')"
          >
            {{ $t("suggestions.learn") }}
          </button>
          <button type="button" class="btn" :disabled="busy" @click="emit('decide', [s.id], 'know')">
            {{ $t("suggestions.know") }}
          </button>
          <button
            type="button"
            class="icon-btn skip"
            :disabled="busy"
            :aria-label="$t('suggestions.skipNamed', { term: s.term })"
            :title="$t('suggestions.skip')"
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

/** The AI's suggested words for an episode, each to learn, mark known or skip. */
const props = defineProps<{ suggestions: Suggestion[]; busy: boolean }>();
const emit = defineEmits<{ decide: [ids: number[], decision: Decision] }>();
const allIds = computed(() => props.suggestions.map((s) => s.id));
</script>

<style scoped>
.items {
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

.skip {
  margin-left: auto;
}
</style>
