<template>
  <div class="page">
    <div class="stack-tight">
      <h1 class="page-title">{{ $t("nav.today") }}</h1>
      <span v-if="me" class="hint">
        {{
          $t("today.learning", {
            language: languageName(me.learningLanguage),
            level: $t(`languages.levels.${me.level}.title`),
          })
        }}
      </span>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <template v-if="today">
      <section v-if="!started" class="panel stack">
        <h2 class="panel-title">{{ $t("today.firstTitle") }}</h2>
        <ol class="steps">
          <li>{{ $t("today.firstSteps.open") }}</li>
          <li>
            {{ $t("today.firstSteps.subtitle", { language: languageName(me?.learningLanguage ?? "") }) }}
          </li>
          <li>{{ $t("today.firstSteps.words") }}</li>
          <li>{{ $t("today.firstSteps.study") }}</li>
        </ol>
        <div>
          <NuxtLink to="/library" class="btn btn-primary">{{ $t("setup.done.library") }}</NuxtLink>
        </div>
      </section>

      <section v-if="started" class="panel study-panel">
        <div class="stack-tight">
          <strong class="study-count">{{
            queued ? $t("today.toStudy", { count: queued }) : $t("today.caughtUp")
          }}</strong>
          <span class="hint">
            <template v-if="queued">{{
              $t("today.dueAndNew", { due: today.due, fresh: today.fresh })
            }}</template>
            <template v-else-if="today.stats.reviewedToday">{{
              $t("today.reviewedToday", { count: today.stats.reviewedToday })
            }}</template>
            <template v-else>{{ $t("today.nothingYet") }}</template>
          </span>
        </div>
        <NuxtLink v-if="queued" to="/study" class="btn btn-primary">
          <AppIcon name="study" :size="18" /> {{ $t("nav.study") }}
        </NuxtLink>
      </section>

      <dl v-if="started" class="tiles">
        <div class="tile">
          <dt>{{ $t("today.streak") }}</dt>
          <dd>{{ $t("today.days", { count: today.stats.streak.current }) }}</dd>
          <span v-if="today.stats.streak.longest > today.stats.streak.current" class="hint">
            {{ $t("today.longest", { count: today.stats.streak.longest }) }}
          </span>
        </div>
        <div class="tile">
          <dt>{{ $t("today.wordsKnown") }}</dt>
          <dd>{{ $n(today.stats.wordsKnown) }}</dd>
          <span class="hint">{{ $t("today.wordsKnownHint") }}</span>
        </div>
        <div class="tile">
          <dt>{{ $t("nav.cards") }}</dt>
          <dd>{{ $n(today.stats.cards) }}</dd>
        </div>
        <div class="tile">
          <dt>{{ $t("today.reviewedTodayLabel") }}</dt>
          <dd>{{ $n(today.stats.reviewedToday) }}</dd>
        </div>
      </dl>

      <ActivityChart
        v-if="today.stats.activity.some((day) => day.count > 0)"
        :activity="today.stats.activity"
      />

      <section v-if="today.recent.length" class="section">
        <h2 class="section-title">{{ $t("today.continue") }}</h2>
        <ul class="list-box">
          <li v-for="r in today.recent" :key="r.subtitleId">
            <NuxtLink :to="`/media/${r.serverItemId}`" class="item-row">
              <PosterImage :id="r.serverItemId" :alt="r.title" :width="120" class="thumb" />
              <span class="item-main">
                <span class="item-title">{{ r.showTitle ?? r.title }}</span>
                <span class="hint">
                  <template v-if="r.kind === 'episode'">{{ episodeLabel(r) }} · {{ r.title }} · </template>
                  {{ $t("show.cards", { count: r.cards }) }}
                </span>
              </span>
              <CoverageBadge :coverage="r.coverage" />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section v-if="upNext.length" class="section">
        <h2 class="section-title">{{ $t("today.upNext") }}</h2>
        <ul class="list-box">
          <li v-for="n in upNext" :key="n.id">
            <NuxtLink :to="`/media/${n.id}`" class="item-row">
              <PosterImage :id="n.id" :alt="n.title" :has-poster="n.hasPoster" :width="120" class="thumb" />
              <span class="item-main">
                <span class="item-title">{{ n.showTitle }}</span>
                <span class="hint">{{ episodeLabel(n) }} · {{ n.title }}</span>
              </span>
              <span class="start">{{ $t("today.start") }} <AppIcon name="next" :size="16" /></span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>
    <p v-else-if="!error" class="muted">{{ $t("common.loading") }}</p>
  </div>
</template>

<script setup lang="ts">
import type { MediaSummary, Today, UpNext } from "~/utils/api";

const { t } = useI18n();
useHead({ title: () => `${t("nav.today")} · Learnarr` });

const { me } = useMe();
const { languageName } = useLanguageNames();
const { errorText } = useErrorMessage();
const today = ref<Today | null>(null);
const upNext = ref<MediaSummary[]>([]);
const error = ref("");
/** Until there is a card or a review, the stats would only be zeros, so Today just says how to start. */
const started = computed(
  () =>
    !!today.value &&
    (today.value.stats.cards > 0 || today.value.stats.reviewedToday > 0 || today.value.recent.length > 0),
);
const queued = computed(() => (today.value ? today.value.due + today.value.fresh : 0));

onMounted(async () => {
  try {
    today.value = await api<Today>("/api/today");
  } catch (e) {
    error.value = errorText(e);
  }
  // Up next asks the media server, so it comes second and its failure is quiet.
  upNext.value = (await api<UpNext>("/api/up-next").catch(() => ({ items: [] }))).items;
});
</script>

<style scoped>
.study-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
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
