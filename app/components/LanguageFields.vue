<template>
  <div class="stack">
    <div class="pair">
      <label class="stack-label">
        {{ $t("languages.learning") }}
        <select v-model="model.learningLanguage" class="select">
          <option v-for="l in languageOptions" :key="l.code" :value="l.code">{{ l.name }}</option>
        </select>
      </label>
      <label class="stack-label">
        {{ $t("languages.native") }}
        <select v-model="model.nativeLanguage" class="select">
          <option v-for="l in languageOptions" :key="l.code" :value="l.code">{{ l.name }}</option>
        </select>
      </label>
    </div>
    <div class="stack-tight">
      <span :id="`${uid}-level`" class="stack-label">{{ $t("languages.levelQuestion") }}</span>
      <div class="choices" role="group" :aria-labelledby="`${uid}-level`">
        <button
          v-for="level in LEVELS"
          :key="level"
          type="button"
          class="choice"
          :aria-pressed="model.level === level ? 'true' : 'false'"
          @click="model.level = level"
        >
          <span class="choice-title">{{ $t(`languages.levels.${level}.title`) }}</span>
          <span class="choice-hint">{{ $t(`languages.levels.${level}.hint`) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LEVELS, type Level } from "#shared/languages";

/** The language a person learns, the one translations are written in, and their level. */
const model = defineModel<{ learningLanguage: string; nativeLanguage: string; level: Level }>({
  required: true,
});
const uid = useId();
const { languageOptions } = useLanguageNames();
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
