<template>
  <section class="section">
    <h2 class="section-title">{{ $t("webhooks.title") }}</h2>
    <p class="muted">{{ $t("webhooks.intro") }}</p>
    <div v-if="urls" class="stack">
      <div class="stack-tight">
        <strong>Plex</strong>
        <p class="hint">{{ $t("webhooks.plexSteps") }}</p>
        <code class="url">{{ urls.plex }}</code>
      </div>
      <div class="stack-tight">
        <strong>Jellyfin</strong>
        <p class="hint">{{ $t("webhooks.jellyfinSteps") }}</p>
        <code class="url">{{ urls.jellyfin }}</code>
      </div>
      <p class="hint">{{ $t("webhooks.secret") }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Get } from "~/utils/api";

/** The addresses to paste into Plex or Jellyfin so a play can send "before you watch" notifications. */
const urls = ref<Get<"/api/settings/webhooks"> | null>(null);
onMounted(async () => {
  urls.value = await api<WebhookUrls>("/api/settings/webhooks").catch(() => null);
});
</script>

<style scoped>
.url {
  display: block;
  padding: 8px 10px;
  border-radius: var(--radius);
  background: var(--surface-2);
  overflow-wrap: anywhere;
  user-select: all;
}
</style>
