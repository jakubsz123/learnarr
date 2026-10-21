<template>
  <div class="page">
    <div class="stack" style="gap: 2px">
      <h1 class="page-title">Today</h1>
      <span v-if="me" class="hint">Learning {{ languageName(me.learningLanguage) }} · {{ me.level }}</span>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <template v-if="today">
      <section class="panel study-panel">
        <div class="stack" style="gap: 2px">
          <strong class="study-count">
            {{ queued ? `${queued} ${queued === 1 ? "card" : "cards"} to study` : "All caught up" }}
          </strong>
          <span class="hint">
            <template v-if="queued">{{ today.due }} due · {{ today.fresh }} new</template>
            <template v-else-if="today.stats.reviewedToday">
              {{ today.stats.reviewedToday }} reviewed today. Cards come back when they're due.
            </template>
            <template v-else>Pick words from an episode to make cards.</template>
          </span>
        </div>
        <NuxtLink v-if="queued" to="/study" class="btn btn-primary">
          <AppIcon name="study" :size="18" /> Study
        </NuxtLink>
      </section>

      <dl class="tiles">
        <div class="tile">
          <dt>Streak</dt>
          <dd>{{ today.stats.streak }} {{ today.stats.streak === 1 ? "day" : "days" }}</dd>
        </div>
        <div class="tile">
          <dt>Words known</dt>
          <dd>{{ (today.stats.knownWords + today.stats.matureCards).toLocaleString() }}</dd>
        </div>
        <div class="tile">
          <dt>Cards</dt>
          <dd>{{ today.stats.cards.toLocaleString() }}</dd>
        </div>
        <div class="tile">
          <dt>Reviewed today</dt>
          <dd>{{ today.stats.reviewedToday }}</dd>
        </div>
      </dl>

      <section v-if="today.recent.length" class="section">
        <h2 class="section-title">Continue</h2>
        <ul class="rows">
          <li v-for="r in today.recent" :key="r.subtitleId">
            <NuxtLink :to="`/media/${r.serverItemId}`" class="item-row">
              <PosterImage :id="r.serverItemId" :alt="r.title" :width="120" class="thumb" />
              <span class="item-main">
                <span class="item-title">{{ r.showTitle ?? r.title }}</span>
                <span class="hint">
                  <template v-if="r.kind === 'episode'">{{ episodeLabel(r) }} · {{ r.title }} · </template>
                  {{ r.cards }} {{ r.cards === 1 ? "card" : "cards" }}
                </span>
              </span>
              <CoverageBadge :coverage="r.coverage" />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-if="upNext.length" class="section">
        <h2 class="section-title">Up next</h2>
        <ul class="rows">
          <li v-for="n in upNext" :key="n.id">
            <NuxtLink :to="`/media/${n.id}`" class="item-row">
              <PosterImage :id="n.id" :alt="n.title" :has-poster="n.hasPoster" :width="120" class="thumb" />
              <span class="item-main">
                <span class="item-title">{{ n.showTitle }}</span>
                <span class="hint">{{ episodeLabel(n) }} · {{ n.title }}</span>
              </span>
              <span class="start">Start <AppIcon name="next" :size="16" /></span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-if="!today.recent.length" class="panel stack">
        <h2 class="section-title" style="border: 0; padding: 0">Start with something you watch</h2>
        <ol class="steps">
          <li>Open the library and pick a film or an episode.</li>
          <li>Get its subtitle in {{ languageName(me?.learningLanguage ?? "") }}.</li>
          <li>
            Tick the words you know, then let the AI pick the ones worth learning, or tap words yourself.
          </li>
          <li>Study the cards here every day.</li>
        </ol>
        <div><NuxtLink to="/library" class="btn btn-primary">Open the library</NuxtLink></div>
      </section>
    </template>
    <p v-else-if="!error" class="muted">Loading…</p>
  </div>
</template>

<script setup lang="ts">
import { languageName } from "#shared/languages";
import type { MediaSummary } from "~/utils/api";

useHead({ title: "Today · Learnarr" });

interface Today {
  due: number;
  fresh: number;
  stats: {
    cards: number;
    matureCards: number;
    knownWords: number;
    reviewedToday: number;
    streak: number;
  };
  recent: {
    subtitleId: number;
    serverItemId: string;
    kind: "movie" | "episode";
    title: string;
    showTitle: string | null;
    seasonNumber: number | null;
    episodeNumber: number | null;
    cards: number;
    coverage: number | null;
  }[];
}

const { me } = useMe();
const today = ref<Today | null>(null);
const upNext = ref<MediaSummary[]>([]);
const error = ref("");
const queued = computed(() => (today.value ? today.value.due + today.value.fresh : 0));

onMounted(async () => {
  try {
    today.value = await $fetch<Today>("/api/today");
  } catch (e) {
    error.value = errorMessage(e);
  }
  upNext.value = (await $fetch<{ items: MediaSummary[] }>("/api/up-next").catch(() => ({ items: [] }))).items;
});
</script>

<style scoped>
.study-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-left: 4px solid var(--accent);
}

.study-count {
  font-size: 19px;
  font-weight: 500;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 0;
}

@media (min-width: 700px) {
  .tiles {
    grid-template-columns: repeat(4, 1fr);
  }
}

.tile {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.tile dt {
  font-size: 12px;
  color: var(--muted);
}

.tile dd {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
}

.rows li + li {
  border-top: 1px solid var(--border);
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  text-decoration: none;
}

.thumb {
  flex: 0 0 40px;
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-weight: 500;
}

.item-main .hint {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.start {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--accent-text);
  font-weight: 500;
}

.steps {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
