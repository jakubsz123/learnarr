<template>
  <div class="stack">
    <MediaHeader :poster-id="show.id" :title="show.title" :has-poster="show.hasPoster">
      <span v-if="show.year" class="hint">{{ show.year }}</span>
      <span v-if="season && episodes.length" class="hint">
        {{ $t("show.started", { started, total: episodes.length }) }}
      </span>
    </MediaHeader>

    <div v-if="seasons.length > 1" class="tabs" role="tablist" :aria-label="$t('show.seasons')">
      <button
        v-for="s in seasons"
        :key="s.id"
        type="button"
        role="tab"
        class="tab"
        :aria-selected="s.id === season?.id ? 'true' : 'false'"
        @click="pick(s.id)"
      >
        {{ seasonName(s) }}
      </button>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="muted">{{ $t("show.loading") }}</p>
    <ol v-else-if="episodes.length" class="list-box">
      <li v-for="ep in episodes" :key="ep.id">
        <NuxtLink :to="`/media/${ep.id}`" class="episode" :class="{ started: !!progress[ep.id] }">
          <span class="ep-num">{{ ep.episodeNumber ?? "" }}</span>
          <span class="ep-main">
            <span class="ep-title">{{ ep.title }}</span>
            <span class="hint">
              {{
                progress[ep.id] ? $t("show.cards", { count: progress[ep.id]!.cards }) : $t("show.notStarted")
              }}
            </span>
          </span>
          <CoverageBadge v-if="progress[ep.id]" :coverage="progress[ep.id]!.coverage" />
          <AppIcon name="next" :size="18" class="muted" />
        </NuxtLink>
      </li>
    </ol>
    <p v-else class="muted">{{ $t("show.noEpisodes") }}</p>
  </div>
</template>

<script setup lang="ts">
import type { MediaResponse, MediaSummary, Progress } from "~/utils/api";

/** A show: its seasons as tabs, each episode with how far the learner is with it. */
const props = defineProps<{ show: MediaSummary; seasons: MediaSummary[] }>();

const { t } = useI18n();
const { errorText } = useErrorMessage();
const route = useRoute();
const router = useRouter();
const episodes = ref<MediaSummary[]>([]);
const progress = ref<Record<string, Progress>>({});
const loading = ref(false);
const error = ref("");

// Season 0 is where servers keep specials; open the first real season unless asked otherwise.
const season = computed(
  () =>
    props.seasons.find((s) => s.id === route.query.season) ??
    props.seasons.find((s) => s.seasonNumber !== 0) ??
    props.seasons[0],
);
const started = computed(() => episodes.value.filter((e) => progress.value[e.id]).length);

function seasonName(s: MediaSummary) {
  if (s.seasonNumber === 0) return t("show.specials");
  return s.seasonNumber !== undefined ? t("show.season", { number: s.seasonNumber }) : s.title;
}

function pick(id: string) {
  router.replace({ query: { ...route.query, season: id } });
}

async function load() {
  if (!season.value) return;
  loading.value = true;
  error.value = "";
  try {
    const data = await api<MediaResponse>(`/api/media/${encodeURIComponent(season.value.id)}`);
    episodes.value = data.children;
    progress.value = data.progress;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}

watch(() => season.value?.id, load, { immediate: true });
</script>

<style scoped>
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
