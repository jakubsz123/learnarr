<template>
  <form v-if="editing" class="edit" @submit.prevent="save">
    <label class="sr-only" :for="id">{{ $t("cards.translation") }}</label>
    <input :id="id" ref="input" v-model.trim="draft" class="input" maxlength="200" required />
    <button type="submit" class="btn btn-primary" :disabled="saving">{{ $t("common.save") }}</button>
    <button type="button" class="btn" @click="editing = false">{{ $t("common.cancel") }}</button>
  </form>
  <button
    v-else
    type="button"
    class="translation"
    :aria-label="$t('cards.editTranslation', { translation: card.translation })"
    @click="edit"
  >
    {{ card.translation }} <AppIcon name="edit" :size="15" class="pencil" />
  </button>
  <p v-if="error" class="hint danger" role="alert">{{ error }}</p>
</template>

<script setup lang="ts">
/** A card's translation that turns into a field when tapped, to correct it. */
const props = defineProps<{ card: { id: number; translation: string } }>();
const emit = defineEmits<{ saved: [translation: string] }>();

const { errorText } = useErrorMessage();
const id = useId();
const editing = ref(false);
const saving = ref(false);
const draft = ref("");
const error = ref("");
const input = ref<HTMLInputElement | null>(null);

async function edit() {
  draft.value = props.card.translation;
  error.value = "";
  editing.value = true;
  await nextTick();
  input.value?.focus();
}

async function save() {
  if (!draft.value) return;
  saving.value = true;
  error.value = "";
  try {
    await api(`/api/cards/${props.card.id}`, { method: "PATCH", body: { translation: draft.value } });
    emit("saved", draft.value);
    editing.value = false;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.edit {
  display: flex;
  gap: 8px;
}

.translation {
  justify-self: start;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: inherit;
  cursor: text;
}

.pencil {
  vertical-align: -2px;
  color: var(--muted);
}
</style>
