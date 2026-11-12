<template>
  <div class="stack">
    <p v-if="saved?.fromEnv" class="notice">{{ $t("openSubtitlesKey.fromEnv") }}</p>
    <div v-else-if="saved?.hasApiKey" class="row">
      <span class="ok">{{ $t("openSubtitlesKey.saved") }}</span>
      <button type="button" class="btn btn-danger" :disabled="feedback.busy.value" @click="remove">
        {{ $t("openSubtitlesKey.remove") }}
      </button>
    </div>
    <form v-else-if="saved" class="stack" method="post" @submit.prevent="save">
      <div class="field">
        <label :for="`${uid}-key`">{{ $t("mediaForm.apiKey") }}</label>
        <div class="stack-tight">
          <input
            :id="`${uid}-key`"
            v-model.trim="apiKey"
            class="input"
            type="password"
            autocomplete="off"
            minlength="8"
            required
          />
          <i18n-t keypath="openSubtitlesKey.hint" tag="span" class="hint">
            <template #link>
              <a href="https://www.opensubtitles.com/en/consumers" target="_blank" rel="noopener">{{
                $t("openSubtitlesKey.linkText")
              }}</a>
            </template>
          </i18n-t>
        </div>
      </div>
      <div>
        <button type="submit" class="btn" :disabled="feedback.busy.value">
          {{ feedback.busy.value ? $t("openSubtitlesKey.checking") : $t("openSubtitlesKey.save") }}
        </button>
      </div>
    </form>
    <Feedback :text="feedback.text.value" :ok="feedback.ok.value" />
  </div>
</template>

<script setup lang="ts">
/**
 * This server's OpenSubtitles.com API key: what searching the catalogue, and
 * finding subtitles there, needs. Downloads still use each person's own account.
 */
const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const uid = useId();
const saved = ref<{ hasApiKey: boolean; fromEnv: boolean } | null>(null);
const apiKey = ref("");
const feedback = useFeedback();

async function load() {
  saved.value = await api<{ hasApiKey: boolean; fromEnv: boolean }>("/api/settings/opensubtitles");
  if (saved.value.hasApiKey) emit("saved");
}

function save() {
  return feedback.run(
    async () => {
      await api("/api/settings/opensubtitles", { method: "PUT", body: { apiKey: apiKey.value } });
      apiKey.value = "";
      await load();
    },
    () => t("openSubtitlesKey.savedNow"),
  );
}

function remove() {
  return feedback.run(async () => {
    await api("/api/settings/opensubtitles", { method: "DELETE" });
    await load();
  });
}

onMounted(load);
</script>
