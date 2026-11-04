<template>
  <article class="card-item" :class="{ suspended: card.suspended }">
    <div class="row-between">
      <span class="term" :lang="card.language">{{ card.term }}</span>
      <span class="state" :class="card.state">{{ stateLabel }}</span>
    </div>
    <TranslationEdit :card="card" @saved="(translation) => emit('updated', { ...card, translation })" />
    <p class="sentence" :lang="card.language"><Sentence :text="card.sentence" :highlight="card.form" /></p>
    <p v-if="card.partOfSpeech || card.note" class="hint">
      {{ [card.partOfSpeech, card.note].filter(Boolean).join(" · ") }}
    </p>
    <slot />
  </article>
</template>

<script setup lang="ts" generic="C extends Card">
import { MATURE_DAYS } from "#shared/srs";
import type { Card } from "~/utils/api";

/** A card as a list row: its word, translation (tap to correct), line and when it's due. */
const props = defineProps<{ card: C }>();
const emit = defineEmits<{ updated: [card: C] }>();

const { t } = useI18n();
const DAY = 86_400_000;

const stateLabel = computed(() => {
  const card = props.card;
  if (card.suspended) return t("cards.state.suspended");
  if (card.state === "new") return t("cards.state.new");
  if (card.intervalDays >= MATURE_DAYS) return t("cards.state.known");
  const days = Math.round((new Date(card.due).getTime() - Date.now()) / DAY);
  if (days <= 0) return t("cards.state.due");
  return days === 1 ? t("cards.state.dueTomorrow") : t("cards.state.dueIn", { count: days });
});
</script>

<style scoped>
.card-item {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
}

.card-item.suspended {
  opacity: 0.6;
}

.term {
  font-size: 17px;
  font-weight: 500;
}

.state {
  flex: none;
  font-size: 12px;
  color: var(--muted);
}

.state.new {
  color: var(--accent-text);
}

.sentence {
  color: var(--muted);
}
</style>
