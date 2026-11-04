<template>
  <section class="panel stack">
    <h2 class="panel-title">{{ $t("episode.getSubtitle.title") }}</h2>
    <p class="muted">{{ hint }}</p>
    <div class="row">
      <button type="button" class="btn btn-primary" :disabled="fetching" @click="getSubtitle">
        {{ fetching ? $t("episode.getSubtitle.busy") : $t("episode.getSubtitle.button") }}
      </button>
      <UploadSubtitle :item-id="itemId" :label="$t('upload.button')" @uploaded="emit('ready')" />
    </div>
    <p v-if="error" class="danger" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
/** A film or episode without a subtitle yet: get one from the server or OpenSubtitles, or upload a file. */
const props = defineProps<{ itemId: string; hasServerSubtitle: boolean }>();
const emit = defineEmits<{ ready: [] }>();

const { t } = useI18n();
const { me } = useMe();
const { languageName } = useLanguageNames();
const { errorText } = useErrorMessage();
const fetching = ref(false);
const error = ref("");

const hint = computed(() => {
  const language = languageName(me.value?.learningLanguage ?? "");
  if (props.hasServerSubtitle) return t("episode.getSubtitle.onServer", { language });
  return me.value?.opensubtitles.connected
    ? t("episode.getSubtitle.fromOpenSubtitles", { language })
    : t("episode.getSubtitle.connectOpenSubtitles", { language });
});

async function getSubtitle() {
  fetching.value = true;
  error.value = "";
  try {
    await api(`/api/media/${encodeURIComponent(props.itemId)}/subtitle`, { method: "POST" });
    emit("ready");
  } catch (e) {
    error.value = errorText(e);
  } finally {
    fetching.value = false;
  }
}
</script>
