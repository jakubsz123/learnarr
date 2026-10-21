<template>
  <div class="page">
    <NuxtLink :to="back.to" class="back"><AppIcon name="back" :size="18" /> {{ back.label }}</NuxtLink>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <template v-if="data">
      <ShowView v-if="data.item.type === 'show'" :show="data.item" :seasons="data.children" />
      <EpisodeView v-else-if="playable" :key="data.item.id" :data="data" @reload="load" />
    </template>
    <p v-else-if="!error" class="muted">Loading…</p>
  </div>
</template>

<script setup lang="ts">
import type { MediaResponse } from "~/utils/api";

const route = useRoute();
const id = computed(() => String(route.params.id));
const data = ref<MediaResponse | null>(null);
const error = ref("");

const playable = computed(() => data.value?.item.type === "movie" || data.value?.item.type === "episode");
const back = computed(() => {
  const item = data.value?.item;
  if (item?.type === "episode" && item.showId) {
    const query = item.seasonId ? `?season=${item.seasonId}` : "";
    return { to: `/media/${item.showId}${query}`, label: item.showTitle ?? "Show" };
  }
  return { to: "/library", label: "Library" };
});

useHead({
  title: computed(() => {
    const item = data.value?.item;
    if (!item) return "Library · Learnarr";
    return `${item.type === "episode" ? `${item.showTitle} ${episodeLabel(item)}` : item.title} · Learnarr`;
  }),
});

async function load() {
  error.value = "";
  try {
    const result = await $fetch<MediaResponse>(`/api/media/${encodeURIComponent(id.value)}`);
    // A season is shown as its tab on the show's page.
    if (result.item.type === "season" && result.item.showId) {
      await navigateTo(`/media/${result.item.showId}?season=${result.item.id}`, { replace: true });
      return;
    }
    data.value = result;
  } catch (e) {
    error.value = errorMessage(e);
  }
}

watch(id, () => {
  data.value = null;
  load();
});
onMounted(load);
</script>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: var(--tap);
  color: var(--muted);
  text-decoration: none;
  align-self: flex-start;
}
</style>
