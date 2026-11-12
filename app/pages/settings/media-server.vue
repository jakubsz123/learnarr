<template>
  <div class="page">
    <div class="section">
      <h1 class="page-title">{{ $t("nav.mediaServer") }}</h1>
      <p class="muted">{{ $t("mediaSettings.intro") }}</p>
    </div>
    <MediaServerForm />
    <WebhookSetup />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
const { t } = useI18n();
useHead({ title: () => `${t("nav.mediaServer")} · ${t("nav.settings")} · Learnarr` });
</script>
