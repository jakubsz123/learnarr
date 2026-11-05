<template>
  <button
    type="button"
    role="tab"
    class="tab library-tab"
    :aria-selected="model === library.id ? 'true' : 'false'"
    @click="model = library.id"
  >
    <AppIcon :name="ICON[library.type] ?? 'film'" :size="18" />
    {{ library.type === "uploads" ? $t("library.uploads") : library.name }}
  </button>
</template>

<script setup lang="ts">
import type { IconName } from "~/utils/icons";

/** One place films and shows come from, as a tab in the library. */
defineProps<{ library: { id: string; name: string; type: string } }>();
const model = defineModel<string>({ required: true });

const ICON: Record<string, IconName> = {
  movies: "film",
  shows: "play",
  catalogue: "search",
  uploads: "upload",
};
</script>

<style scoped>
.library-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  /* Sit on the shared underline, so the selected tab's accent covers it. */
  margin-bottom: -1px;
}
</style>
