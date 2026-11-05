<template>
  <form class="panel stack" @submit.prevent="upload">
    <h2 class="panel-title">{{ $t("newUpload.title") }}</h2>
    <p class="muted">{{ $t("newUpload.intro") }}</p>
    <div class="field">
      <label :for="`${uid}-title`">{{ $t("newUpload.name") }}</label>
      <input
        :id="`${uid}-title`"
        v-model.trim="title"
        class="input"
        maxlength="200"
        required
        :placeholder="$t('newUpload.namePlaceholder')"
      />
    </div>
    <div class="field">
      <span class="field-label">{{ $t("newUpload.file") }}</span>
      <span class="row">
        <input
          :id="`${uid}-file`"
          ref="file"
          type="file"
          accept=".srt,.vtt,.ass,.ssa,text/plain"
          class="sr-only"
          required
          @change="fileName = file?.files?.[0]?.name ?? ''"
        />
        <label :for="`${uid}-file`" class="btn"
          ><AppIcon name="upload" :size="18" /> {{ $t("newUpload.choose") }}</label
        >
        <span v-if="fileName" class="hint">{{ fileName }}</span>
      </span>
    </div>
    <div>
      <button type="submit" class="btn btn-primary" :disabled="busy">
        {{ busy ? $t("newUpload.busy") : $t("newUpload.button") }}
      </button>
    </div>
    <p v-if="error" class="danger" role="alert">{{ error }}</p>
  </form>
</template>

<script setup lang="ts">
/** A subtitle file of the learner's own, for something that isn't on the server or in the catalogue. */
const { errorText } = useErrorMessage();
const uid = useId();
const title = ref("");
const file = ref<HTMLInputElement | null>(null);
const fileName = ref("");
const busy = ref(false);
const error = ref("");

async function upload() {
  const chosen = file.value?.files?.[0];
  if (!chosen || !title.value) return;
  busy.value = true;
  error.value = "";
  try {
    const form = new FormData();
    form.append("title", title.value);
    form.append("file", chosen);
    const { id } = await api<{ id: string }>("/api/uploads", { method: "POST", body: form });
    await navigateTo(`/media/${id}`);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.field label.btn {
  cursor: pointer;
  font-weight: 500;
}

input:focus-visible + label {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
