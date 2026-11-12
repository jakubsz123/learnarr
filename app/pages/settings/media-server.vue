<template>
  <div class="page">
    <div class="section">
      <h1 class="page-title">{{ $t("nav.mediaServer") }}</h1>
      <p class="muted">{{ $t("mediaSettings.intro") }}</p>
    </div>
    <MediaServerForm />
    <section class="section">
      <h2 class="section-title">OpenSubtitles.com</h2>
      <p class="muted">{{ $t("openSubtitlesKey.intro") }}</p>
      <OpenSubtitlesKeyForm />
    </section>
    <WebhookSetup />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
const { t } = useI18n();
useHead({ title: () => `${t("nav.mediaServer")} · ${t("nav.settings")} · Learnarr` });
</script>
