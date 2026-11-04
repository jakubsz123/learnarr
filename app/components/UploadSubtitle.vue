<template>
  <span class="upload">
    <input
      :id="id"
      ref="input"
      type="file"
      accept=".srt,.vtt,.ass,.ssa,text/plain"
      class="sr-only"
      @change="upload"
    />
    <label :for="id" class="btn" :class="{ 'is-busy': busy }">
      <AppIcon name="upload" :size="18" /> {{ busy ? $t("upload.busy") : label }}
    </label>
    <span v-if="error" class="danger" role="alert">{{ error }}</span>
  </span>
</template>

<script setup lang="ts">
/** Choose a subtitle file from the device for a film or episode. */
const props = defineProps<{ itemId: string; label: string }>();
const emit = defineEmits<{ uploaded: [] }>();

const { errorText } = useErrorMessage();
const id = useId();
const input = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const error = ref("");

async function upload() {
  const file = input.value?.files?.[0];
  if (!file) return;
  busy.value = true;
  error.value = "";
  try {
    const form = new FormData();
    form.append("file", file);
    await api(`/api/media/${encodeURIComponent(props.itemId)}/subtitle/upload`, {
      method: "POST",
      body: form,
    });
    emit("uploaded");
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
    if (input.value) input.value.value = "";
  }
}
</script>

<style scoped>
.upload {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.upload label {
  cursor: pointer;
}

.upload input:focus-visible + label {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.is-busy {
  opacity: 0.55;
  pointer-events: none;
}
</style>
