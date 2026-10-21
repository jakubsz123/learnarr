<template>
  <article class="card-item" :class="{ suspended: card.suspended }">
    <div class="card-top">
      <span class="term" :lang="card.language">{{ card.term }}</span>
      <span class="state" :class="card.state">{{ stateLabel }}</span>
    </div>
    <form v-if="editing" class="edit" @submit.prevent="save">
      <label class="sr-only" :for="`tr-${card.id}`">Translation</label>
      <input :id="`tr-${card.id}`" ref="input" v-model.trim="draft" class="input" maxlength="200" required />
      <button type="submit" class="btn btn-primary" :disabled="saving">Save</button>
      <button type="button" class="btn" @click="editing = false">Cancel</button>
    </form>
    <button
      v-else
      type="button"
      class="translation"
      :aria-label="`Edit translation: ${card.translation}`"
      @click="edit"
    >
      {{ card.translation }}
    </button>
    <p class="sentence" :lang="card.language"><Sentence :text="card.sentence" :highlight="card.form" /></p>
    <p v-if="card.partOfSpeech || card.note" class="hint">
      {{ [card.partOfSpeech, card.note].filter(Boolean).join(" · ") }}
    </p>
    <slot />
  </article>
</template>

<script setup lang="ts">
import type { Card } from "~/utils/api";

const props = defineProps<{ card: Card }>();
const emit = defineEmits<{ updated: [card: Card] }>();

const editing = ref(false);
const saving = ref(false);
const draft = ref("");
const input = ref<HTMLInputElement | null>(null);

const stateLabel = computed(() => {
  if (props.card.suspended) return "Suspended";
  if (props.card.state === "new") return "New";
  if (props.card.intervalDays >= 21) return "Known";
  const days = Math.round((new Date(props.card.due).getTime() - Date.now()) / 86_400_000);
  return days <= 0 ? "Due" : days === 1 ? "Due tomorrow" : `Due in ${days} days`;
});

async function edit() {
  draft.value = props.card.translation;
  editing.value = true;
  await nextTick();
  input.value?.focus();
}

async function save() {
  if (!draft.value) return;
  saving.value = true;
  try {
    const card = await $fetch<Card>(`/api/cards/${props.card.id}`, {
      method: "PATCH",
      body: { translation: draft.value },
    });
    emit("updated", card);
    editing.value = false;
  } finally {
    saving.value = false;
  }
}
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

.card-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
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

.translation {
  justify-self: start;
  padding: 0;
  border: 0;
  border-bottom: 1px dashed var(--border);
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: text;
}

.sentence {
  color: var(--muted);
}

.edit {
  display: flex;
  gap: 8px;
}
</style>
