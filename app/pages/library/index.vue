<template>
  <div class="page">
    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <template v-else-if="libraries.length">
      <div class="section">
        <div class="pills" role="tablist" :aria-label="$t('library.libraries')">
          <button
            v-for="lib in libraries"
            :key="lib.id"
            type="button"
            role="tab"
            class="pill"
            :aria-selected="lib.id === libraryId ? 'true' : 'false'"
            @click="libraryId = lib.id"
          >
            {{ lib.name }}
          </button>
        </div>
        <SearchField
          v-model="search"
          :label="isCatalogue ? $t('library.searchCatalogue') : $t('library.search')"
          :placeholder="isCatalogue ? $t('library.searchCatalogue') : $t('library.searchPlaceholder')"
        />
        <p v-if="!server && me?.isAdmin" class="hint">
          <NuxtLink to="/settings/media-server">{{ $t("library.ownLibrary") }}</NuxtLink>
        </p>
      </div>

      <div class="grid">
        <NuxtLink v-for="item in items" :key="item.id" :to="`/media/${item.id}`" class="tile">
          <PosterImage :id="item.id" :alt="item.title" :has-poster="item.hasPoster" />
          <span class="tile-title">{{ item.title }}</span>
          <span v-if="item.year" class="hint">{{ item.year }}</span>
        </NuxtLink>
      </div>
      <p v-if="!loading && !items.length" class="muted">
        {{
          search
            ? $t("library.noMatch", { search })
            : isCatalogue
              ? $t("library.catalogueHint")
              : $t("library.empty")
        }}
      </p>
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

type Library = Get<"/api/library">["libraries"][number];
type Item = Get<"/api/library/:id/items">["items"][number];

const PAGE = 60;
const SEARCH_DELAY_MS = 300;

const { t } = useI18n();
useHead({ title: () => `${t("nav.library")} · Learnarr` });

const { me } = useMe();
const { errorText } = useErrorMessage();
const route = useRoute();
const router = useRouter();

const libraries = ref<Library[]>([]);
const server = ref<string | null>(null);
const libraryId = ref(typeof route.query.lib === "string" ? route.query.lib : "");
const search = ref("");
const items = ref<Item[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref("");

const isCatalogue = computed(
  () => libraries.value.find((l) => l.id === libraryId.value)?.type === "catalogue",
);

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
    const answer = await api<Get<"/api/library">>("/api/library");
    libraries.value = answer.libraries;
    server.value = answer.server;
    if (!libraries.value.some((l) => l.id === libraryId.value))
      libraryId.value = libraries.value[0]?.id ?? "";
    else await loadItems(true);
  } catch (e) {
    error.value = errorText(e);
  } finally {
    if (!libraryId.value) loading.value = false;
  }
});
</script>

<style scoped>
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
