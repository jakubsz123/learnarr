<template>
  <div class="stack">
    <div class="pair">
      <label class="stack-label">
        I'm learning
        <select v-model="model.learningLanguage" class="select">
          <option v-for="l in LANGUAGES" :key="l.code" :value="l.code">{{ l.name }}</option>
        </select>
      </label>
      <label class="stack-label">
        Translate into
        <select v-model="model.nativeLanguage" class="select">
          <option v-for="l in LANGUAGES" :key="l.code" :value="l.code">{{ l.name }}</option>
        </select>
      </label>
    </div>
    <div class="stack" style="gap: 8px">
      <span :id="`${uid}-level`" style="font-weight: 500">How much do you know already?</span>
      <div class="choices" role="group" :aria-labelledby="`${uid}-level`">
        <button
          v-for="l in levels"
          :key="l.value"
          type="button"
          class="choice"
          :aria-pressed="model.level === l.value ? 'true' : 'false'"
          @click="model.level = l.value"
        >
          <span class="choice-title">{{ l.label }}</span>
          <span class="choice-hint">{{ l.hint }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LANGUAGES, type Level } from "#shared/languages";

export interface LanguageChoice {
  learningLanguage: string;
  nativeLanguage: string;
  level: Level;
}

const model = defineModel<LanguageChoice>({ required: true });
const uid = useId();

const levels: { value: Level; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "Everyday words first" },
  { value: "intermediate", label: "Intermediate", hint: "Skip the basics" },
  { value: "advanced", label: "Advanced", hint: "Idioms and rarer words" },
];
</script>

<style scoped>
.pair {
  display: grid;
  gap: 12px;
}

@media (min-width: 560px) {
  .pair {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
