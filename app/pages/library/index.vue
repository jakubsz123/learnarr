<template>
  <div class="page">
    <h1 class="page-title">{{ $t("nav.library") }}</h1>
    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>
    <p v-else-if="!all.length" class="muted">{{ $t("common.loading") }}</p>

    <template v-else-if="all.length">
      <div class="section">
        <div class="sources">
          <div v-if="libraries.length" class="source">
            <h2 :id="`${uid}-server`" class="source-label">
              {{ $t("library.onServer", { name: serverName }) }}
            </h2>
            <div class="source-tabs" role="tablist" :aria-labelledby="`${uid}-server`">
              <LibraryTab v-for="lib in libraries" :key="lib.id" v-model="libraryId" :library="lib" />
            </div>
          </div>
          <div class="source">
            <h2 :id="`${uid}-elsewhere`" class="source-label" :class="{ 'sr-only': !libraries.length }">
              {{ $t("library.elsewhere") }}
            </h2>
            <div class="source-tabs" role="tablist" :aria-labelledby="`${uid}-elsewhere`">
              <LibraryTab v-for="lib in elsewhere" :key="lib.id" v-model="libraryId" :library="lib" />
            </div>
          </div>
        </div>
        <div v-if="!server && me?.isAdmin">
          <NuxtLink to="/settings/media-server" class="btn">{{ $t("library.ownLibrary") }}</NuxtLink>
        </div>
        <NewUpload v-if="selected?.type === 'uploads'" />
        <SearchField
          v-model="search"
          :label="isCatalogue ? $t('library.searchCatalogue') : $t('library.search')"
          :placeholder="isCatalogue ? $t('library.searchCatalogue') : $t('library.searchPlaceholder')"
        />
      </div>

      <div class="grid">
        <NuxtLink v-for="item in items" :key="item.id" :to="`/media/${item.id}`" class="tile">
          <PosterImage :id="item.id" :alt="item.title" :has-poster="item.hasPoster" />
          <span class="tile-title">{{ item.title }}</span>
          <span v-if="item.year" class="hint">{{ item.year }}</span>
        </NuxtLink>
      </div>
      <p v-if="!loading && !items.length" class="muted">{{ emptyText }}</p>
      <button
        v-if="items.length < total"
        type="button"
        class="btn"
        :disabled="loading"
        @click="loadItems(false)"
      >
        {{ loading ? $t("common.loading") : $t("library.loadMore") }}
      </button>
      <p v-if="isCatalogue" class="hint">
        {{ $t("library.attribution") }}
        <a href="https://www.opensubtitles.com" target="_blank" rel="noopener">OpenSubtitles.com</a>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Get } from "~/utils/api";

type Sources = Get<"/api/library">;
type Library = Sources["libraries"][number];
type Item = Get<"/api/library/:id/items">["items"][number];

const PAGE = 60;
const SEARCH_DELAY_MS = 300;

const { t } = useI18n();
useHead({ title: () => `${t("nav.library")} · Learnarr` });

const { me } = useMe();
const { errorText } = useErrorMessage();
const route = useRoute();
const router = useRouter();

const uid = useId();
const libraries = ref<Library[]>([]);
const elsewhere = ref<Library[]>([]);
const server = ref<Sources["server"]>(null);
const all = computed(() => [...libraries.value, ...elsewhere.value]);
const selected = computed(() => all.value.find((l) => l.id === libraryId.value));
const serverName = computed(() => {
  const s = server.value;
  return s?.name || (s?.kind === "jellyfin" ? "Jellyfin" : "Plex");
});
const libraryId = ref(typeof route.query.lib === "string" ? route.query.lib : "");
const search = ref("");
const items = ref<Item[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref("");

const isCatalogue = computed(() => selected.value?.type === "catalogue");
const emptyText = computed(() => {
  if (search.value) return t("library.noMatch", { search: search.value });
  if (isCatalogue.value) return t("library.catalogueHint");
  return selected.value?.type === "uploads" ? t("library.uploadsEmpty") : t("library.empty");
});

async function loadItems(reset: boolean) {
  if (!libraryId.value) return;
  loading.value = true;
  try {
    const page = await api<LibraryPage>(`/api/library/${libraryId.value}/items`, {
      query: { start: reset ? 0 : items.value.length, limit: PAGE, search: search.value || undefined },
    });
    items.value = reset ? page.items : [...items.value, ...page.items];
    total.value = page.total;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}

watch(libraryId, (id) => {
  router.replace({ query: { ...route.query, lib: id } });
  loadItems(true);
});
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadItems(true), SEARCH_DELAY_MS);
});

onMounted(async () => {
  try {
    const answer = await api<Sources>("/api/library");
    libraries.value = answer.libraries;
    elsewhere.value = answer.elsewhere;
    server.value = answer.server;
    if (!all.value.some((l) => l.id === libraryId.value)) libraryId.value = all.value[0]?.id ?? "";
    else await loadItems(true);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    if (!libraryId.value) loading.value = false;
  }
});
</script>

<style scoped>
/* On a phone each group gets its own row and underline, so none is pushed off-screen. */
.sources {
  display: grid;
  gap: 12px;
}

.source {
  display: grid;
  gap: 2px;
  min-width: 0;
  border-bottom: 1px solid var(--border);
}

.source-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}

@media (min-width: 700px) {
  /* Side by side, sharing one underline. */
  .sources {
    display: flex;
    gap: 4px 28px;
    border-bottom: 1px solid var(--border);
  }

  .source {
    flex: none;
    border-bottom: 0;
  }
}

.source-label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 16px 12px;
}

@media (min-width: 700px) {
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-decoration: none;
  min-width: 0;
}

.tile-title {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
