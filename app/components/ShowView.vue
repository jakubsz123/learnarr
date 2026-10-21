<template>
  <div class="stack" style="gap: 20px">
    <header class="head">
      <PosterImage
        :id="show.id"
        :alt="show.title"
        :has-poster="show.hasPoster"
        :width="240"
        class="head-poster"
      />
      <div class="stack" style="gap: 4px">
        <h1 class="page-title">{{ show.title }}</h1>
        <span v-if="show.year" class="hint">{{ show.year }}</span>
        <span v-if="season && episodes.length" class="hint">
          {{ started }} of {{ episodes.length }} episodes started this season
        </span>
      </div>
    </header>

    <div v-if="seasons.length > 1" class="seasons" role="tablist" aria-label="Seasons">
      <button
        v-for="s in seasons"
        :key="s.id"
        type="button"
        role="tab"
        class="season-tab"
        :aria-selected="s.id === season?.id ? 'true' : 'false'"
        @click="pick(s.id)"
      >
        {{
          s.seasonNumber === 0
            ? "Specials"
            : s.seasonNumber !== undefined
              ? `Season ${s.seasonNumber}`
              : s.title
        }}
      </button>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="muted">Loading episodes…</p>
    <ol v-else-if="episodes.length" class="episodes">
      <li v-for="ep in episodes" :key="ep.id">
        <NuxtLink :to="`/media/${ep.id}`" class="episode" :class="{ started: !!progress[ep.id] }">
          <span class="ep-num">{{ ep.episodeNumber ?? "" }}</span>
          <span class="ep-main">
            <span class="ep-title">{{ ep.title }}</span>
            <span class="hint">
              <template v-if="progress[ep.id]">
                {{ progress[ep.id]!.cards }} {{ progress[ep.id]!.cards === 1 ? "card" : "cards" }}
              </template>
              <template v-else>Not started</template>
            </span>
          </span>
          <CoverageBadge v-if="progress[ep.id]" :coverage="progress[ep.id]!.coverage" />
          <AppIcon name="next" :size="18" class="muted" />
        </NuxtLink>
      </li>
    </ol>
    <p v-else class="muted">No episodes in this season.</p>
  </div>
</template>

<script setup lang="ts">
import type { MediaResponse, MediaSummary, Progress } from "~/utils/api";

const props = defineProps<{ show: MediaSummary; seasons: MediaSummary[] }>();

const route = useRoute();
const router = useRouter();
const episodes = ref<MediaSummary[]>([]);
const progress = ref<Record<string, Progress>>({});
const loading = ref(false);
const error = ref("");

const season = computed(
  () =>
    props.seasons.find((s) => s.id === route.query.season) ??
    props.seasons.find((s) => s.seasonNumber !== 0) ??
    props.seasons[0],
);
const started = computed(() => episodes.value.filter((e) => progress.value[e.id]).length);

function pick(id: string) {
  router.replace({ query: { ...route.query, season: id } });
}

async function load() {
  if (!season.value) return;
  loading.value = true;
  error.value = "";
  try {
    const data = await $fetch<MediaResponse>(`/api/media/${encodeURIComponent(season.value.id)}`);
    episodes.value = data.children;
    progress.value = data.progress;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

watch(() => season.value?.id, load, { immediate: true });
</script>

<style scoped>
.head {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.head-poster {
  flex: 0 0 96px;
}

@media (min-width: 700px) {
  .head-poster {
    flex-basis: 140px;
  }
}

.seasons {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  scrollbar-width: none;
}

.season-tab {
  flex: none;
  min-height: var(--tap);
  padding: 0 14px;
  border: 0;
  border-bottom: 3px solid transparent;
  background: none;
  color: var(--muted);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.season-tab[aria-selected="true"] {
  border-bottom-color: var(--accent);
  color: var(--text);
}

.episodes {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
}

.episodes li + li {
  border-top: 1px solid var(--border);
}

.episode {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  padding: 8px 12px;
  text-decoration: none;
}

.episode.started {
  box-shadow: inset 3px 0 0 var(--accent);
}

.ep-num {
  flex: 0 0 28px;
  color: var(--muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ep-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ep-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
