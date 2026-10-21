<template>
  <div class="page">
    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <template v-else-if="libraries.length">
      <div class="section">
        <div class="tabs" role="tablist" aria-label="Libraries">
          <button
            v-for="lib in libraries"
            :key="lib.id"
            type="button"
            role="tab"
            class="tab-chip"
            :aria-selected="lib.id === libraryId ? 'true' : 'false'"
            @click="libraryId = lib.id"
          >
            {{ lib.name }}
          </button>
        </div>
        <label class="search">
          <span class="sr-only">Search this library</span>
          <AppIcon name="search" :size="18" />
          <input v-model="search" class="input" type="search" placeholder="Search" />
        </label>
      </div>

      <div class="grid">
        <NuxtLink v-for="item in items" :key="item.id" :to="`/media/${item.id}`" class="tile">
          <PosterImage :id="item.id" :alt="item.title" :has-poster="item.hasPoster" />
          <span class="tile-title">{{ item.title }}</span>
          <span v-if="item.year" class="hint">{{ item.year }}</span>
        </NuxtLink>
      </div>
      <p v-if="!loading && !items.length" class="muted">
        Nothing here{{ search ? ` matches "${search}"` : "" }}.
      </p>
      <button v-if="items.length < total" type="button" class="btn" :disabled="loading" @click="loadMore">
        {{ loading ? "Loading…" : "Load more" }}
      </button>
    </template>

    <div v-else-if="!loading" class="panel stack">
      <h1 class="page-title">No media server yet</h1>
      <p class="muted">
        {{
          me?.isAdmin
            ? "Connect Plex or Jellyfin to browse your library."
            : "Ask whoever runs this server to connect Plex or Jellyfin."
        }}
      </p>
      <NuxtLink v-if="me?.isAdmin" to="/settings/media-server" class="btn btn-primary"
        >Connect a media server</NuxtLink
      >
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: "Library · Learnarr" });

interface Library {
  id: string;
  name: string;
  type: "movies" | "shows";
}
interface Item {
  id: string;
  title: string;
  year?: number;
  hasPoster: boolean;
}
const PAGE = 60;
const { me } = useMe();
const route = useRoute();
const router = useRouter();

const libraries = ref<Library[]>([]);
const libraryId = ref<string>(typeof route.query.lib === "string" ? route.query.lib : "");
const search = ref("");
const items = ref<Item[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref("");

async function loadItems(reset: boolean) {
  if (!libraryId.value) return;
  loading.value = true;
  try {
    const page = await $fetch<{ items: Item[]; total: number }>(`/api/library/${libraryId.value}/items`, {
      query: { start: reset ? 0 : items.value.length, limit: PAGE, search: search.value || undefined },
    });
    items.value = reset ? page.items : [...items.value, ...page.items];
    total.value = page.total;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

const loadMore = () => loadItems(false);

watch(libraryId, (id) => {
  router.replace({ query: { ...route.query, lib: id } });
  loadItems(true);
});
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadItems(true), 300);
});

onMounted(async () => {
  try {
    const data = await $fetch<{ libraries: Library[] }>("/api/library");
    libraries.value = data.libraries;
    if (!libraries.value.some((l) => l.id === libraryId.value))
      libraryId.value = libraries.value[0]?.id ?? "";
    else await loadItems(true);
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status !== 409) error.value = errorMessage(e);
  } finally {
    if (!libraryId.value) loading.value = false;
  }
});
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.tab-chip {
  flex: none;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.tab-chip[aria-selected="true"] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 500;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 420px;
  color: var(--muted);
}

.search svg {
  position: absolute;
  left: 12px;
}

.search .input {
  padding-left: 38px;
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
