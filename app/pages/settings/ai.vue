<template>
  <div class="page">
    <div class="section">
      <h1 class="page-title">{{ $t("aiSettings.title") }}</h1>
      <p class="muted">{{ $t("aiSettings.intro") }}</p>
    </div>
    <AiProviderForm ref="form" />
    <div class="row">
      <button type="button" class="btn btn-primary" :disabled="feedback.busy.value" @click="save">
        {{ feedback.busy.value ? $t("setup.saving") : $t("common.save") }}
      </button>
      <Feedback :text="feedback.text.value" :ok="feedback.ok.value" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
const { t } = useI18n();
useHead({ title: () => `${t("nav.ai")} · ${t("nav.settings")} · Learnarr` });

const form = ref<{ save: () => Promise<string | null> } | null>(null);
const feedback = useFeedback();

async function save() {
  if (!form.value) return;
  feedback.busy.value = true;
  const error = await form.value.save();
  feedback.busy.value = false;
  if (error) {
    feedback.text.value = error;
    feedback.ok.value = false;
  } else {
    feedback.succeed(t("common.saved"));
  }
}
</script>
