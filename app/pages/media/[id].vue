<template>
  <div class="page">
    <NuxtLink :to="backTo" class="back"><AppIcon name="back" :size="18" /> {{ backLabel }}</NuxtLink>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <template v-if="data">
      <header class="head">
        <PosterImage
          :id="data.item.id"
          :alt="data.item.title"
          :has-poster="data.item.hasPoster"
          :width="240"
          class="head-poster"
        />
        <div class="stack" style="gap: 4px">
          <span v-if="data.item.showTitle" class="muted">{{ data.item.showTitle }}</span>
          <h1 class="page-title">{{ heading }}</h1>
          <span v-if="data.item.year" class="hint">{{ data.item.year }}</span>
        </div>
      </header>

      <!-- A show lists its seasons; a season its episodes. -->
      <div v-if="data.children.length" class="list">
        <NuxtLink v-for="child in data.children" :key="child.id" :to="`/media/${child.id}`" class="list-row">
          <span class="list-num">{{ child.type === "episode" ? child.episodeNumber : "" }}</span>
          <span class="list-title">{{ child.title }}</span>
          <AppIcon name="next" :size="18" />
        </NuxtLink>
      </div>

      <template v-else-if="isPlayable">
        <section class="panel stack" aria-labelledby="subtitle-step">
          <h2 id="subtitle-step" class="step-title"><span class="step-num">1</span> Subtitle</h2>
          <p v-if="data.subtitle" class="ok">
            ✓ {{ languageName(me?.learningLanguage ?? "") }} subtitle from
            {{ sourceName(data.subtitle.source) }} · {{ data.subtitle.cueCount }} lines
          </p>
          <template v-else>
            <p class="muted">
              {{
                data.hasServerSubtitle
                  ? `Your media server has a ${languageName(me?.learningLanguage ?? "")} subtitle for this.`
                  : me?.opensubtitles.connected
                    ? `No ${languageName(me?.learningLanguage ?? "")} subtitle on the media server; Learnarr will download one from OpenSubtitles.com with your account.`
                    : `No ${languageName(me?.learningLanguage ?? "")} subtitle on the media server. Connect OpenSubtitles.com in Settings → Account to download one.`
              }}
            </p>
            <button type="button" class="btn btn-primary" :disabled="busy" @click="getSubtitle">
              {{ busy ? "Getting it…" : "Get subtitle" }}
            </button>
          </template>
        </section>

        <section v-if="data.subtitle" class="panel stack" aria-labelledby="words-step">
          <h2 id="words-step" class="step-title"><span class="step-num">2</span> Words</h2>
          <p class="muted">
            {{
              data.cardCount
                ? `${data.cardCount} cards from this so far. Pick more to add the next ones worth learning.`
                : "Your AI provider reads the subtitle and picks the words worth learning at your level."
            }}
          </p>
          <div class="row" role="group" aria-label="How many words">
            <button
              v-for="n in COUNTS"
              :key="n"
              type="button"
              class="count"
              :aria-pressed="count === n ? 'true' : 'false'"
              @click="count = n"
            >
              {{ n }}
            </button>
            <button type="button" class="btn btn-primary" :disabled="picking" @click="pick">
              {{ picking ? "Picking words…" : data.cardCount ? "Pick more words" : "Pick words" }}
            </button>
          </div>
          <p v-if="picking" class="hint">
            This can take a minute, longer with a local model. You can leave this page.
          </p>
          <p v-if="pickMessage" :class="pickOk ? 'ok' : 'danger'" role="status">{{ pickMessage }}</p>
        </section>

        <section v-if="cards.length" class="stack" aria-labelledby="cards-step">
          <div class="row" style="justify-content: space-between">
            <h2 id="cards-step" class="section-title" style="flex: 1">Cards from this</h2>
            <NuxtLink to="/study" class="btn btn-primary">Study now</NuxtLink>
          </div>
          <ul class="cards">
            <li v-for="card in cards" :key="card.id" class="card-row">
              <span class="term">{{ card.term }}</span>
              <span class="muted">{{ card.translation }}</span>
              <Sentence :text="card.sentence" :highlight="card.form" class="hint" />
            </li>
          </ul>
        </section>
      </template>
    </template>

    <p v-else-if="!error" class="muted">Loading…</p>
  </div>
</template>

<script setup lang="ts">
import { languageName } from "#shared/languages";

interface Summary {
  id: string;
  type: "movie" | "show" | "season" | "episode";
  title: string;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  showTitle?: string;
  showId?: string;
  hasPoster: boolean;
}
interface MediaResponse {
  item: Summary;
  children: Summary[];
  hasServerSubtitle: boolean;
  subtitle: { id: number; source: string; cueCount: number; wordsPickedAt: string | null } | null;
  cardCount: number;
}
interface Card {
  id: number;
  term: string;
  form: string;
  translation: string;
  sentence: string;
}

const COUNTS = [10, 20, 30] as const;

const route = useRoute();
const { me } = useMe();
const id = computed(() => String(route.params.id));
const data = ref<MediaResponse | null>(null);
const cards = ref<Card[]>([]);
const error = ref("");
const busy = ref(false);
const count = ref<(typeof COUNTS)[number]>(20);
const picking = ref(false);
const pickMessage = ref("");
const pickOk = ref(false);

const isPlayable = computed(() => data.value?.item.type === "movie" || data.value?.item.type === "episode");
const heading = computed(() => {
  const item = data.value?.item;
  if (!item) return "";
  if (item.type === "episode")
    return `S${item.seasonNumber ?? "?"} E${item.episodeNumber ?? "?"} · ${item.title}`;
  return item.title;
});
const backTo = computed(() =>
  data.value?.item.type === "episode" && data.value.item.showId
    ? `/media/${data.value.item.showId}`
    : "/library",
);
const backLabel = computed(() =>
  data.value?.item.type === "episode" && data.value.item.showTitle ? data.value.item.showTitle : "Library",
);

useHead({ title: computed(() => `${heading.value || "Library"} · Learnarr`) });

const sourceName = (source: string) =>
  ({ plex: "Plex", jellyfin: "Jellyfin", opensubtitles: "OpenSubtitles.com" })[source] ?? source;

async function load() {
  error.value = "";
  try {
    data.value = await $fetch<MediaResponse>(`/api/media/${encodeURIComponent(id.value)}`);
    cards.value = data.value.subtitle
      ? (await $fetch<{ cards: Card[] }>(`/api/subtitles/${data.value.subtitle.id}`)).cards
      : [];
  } catch (e) {
    error.value = errorMessage(e);
  }
}

async function getSubtitle() {
  busy.value = true;
  error.value = "";
  try {
    await $fetch(`/api/media/${encodeURIComponent(id.value)}/subtitle`, { method: "POST" });
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    busy.value = false;
  }
}

async function pick() {
  if (!data.value?.subtitle) return;
  picking.value = true;
  pickMessage.value = "";
  try {
    const { jobId } = await $fetch<{ jobId: string }>(`/api/subtitles/${data.value.subtitle.id}/words`, {
      method: "POST",
      body: { count: count.value },
    });
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const job = await $fetch<{ state: string; message: string | null; result: { added: number } | null }>(
        `/api/jobs/${jobId}`,
      );
      if (job.state === "done") {
        const added = job.result?.added ?? 0;
        pickMessage.value = added
          ? `Added ${added} new ${added === 1 ? "card" : "cards"}.`
          : "No new words: you have them all already.";
        pickOk.value = true;
        break;
      }
      if (job.state === "failed") {
        pickMessage.value = job.message ?? "Picking words failed.";
        pickOk.value = false;
        break;
      }
    }
    await load();
    useDueCount().refresh();
  } catch (e) {
    pickMessage.value = errorMessage(e);
    pickOk.value = false;
  } finally {
    picking.value = false;
  }
}

watch(id, () => {
  data.value = null;
  cards.value = [];
  pickMessage.value = "";
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

.list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  text-decoration: none;
}

.list-row:last-child {
  border-bottom: 0;
}

.list-num {
  flex: 0 0 28px;
  color: var(--muted);
  text-align: right;
}

.list-title {
  flex: 1;
  min-width: 0;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 500;
}

.step-num {
  width: 26px;
  height: 26px;
  border-radius: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 13px;
  font-weight: 700;
}

.count {
  min-width: var(--tap);
  min-height: var(--tap);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.count[aria-pressed="true"] {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
  font-weight: 700;
}

.cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.card-row {
  display: grid;
  gap: 2px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.card-row:last-child {
  border-bottom: 0;
}

.term {
  font-weight: 500;
}
</style>
