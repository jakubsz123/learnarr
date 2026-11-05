<template>
  <button
    type="button"
    role="tab"
    class="pill"
    :aria-selected="model === library.id ? 'true' : 'false'"
    @click="model = library.id"
  >
    {{ library.type === "uploads" ? $t("library.uploads") : library.name }}
  </button>
</template>

<script setup lang="ts">
/** One place films and shows come from, as a tab in the library. */
defineProps<{ library: { id: string; name: string; type: string } }>();
const model = defineModel<string>({ required: true });
</script>
