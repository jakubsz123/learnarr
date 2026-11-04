<template>
  <label class="search-field">
    <span class="sr-only">{{ label }}</span>
    <AppIcon name="search" :size="18" />
    <input v-model="query" class="input" type="search" :placeholder="placeholder" />
  </label>
</template>

<script setup lang="ts">
/** A search box. The model updates as you type; callers debounce if they need to. */
defineProps<{ label: string; placeholder: string }>();
const query = defineModel<string>({ required: true });
</script>

<style scoped>
.search-field {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 420px;
  color: var(--muted);
}

.search-field svg {
  position: absolute;
  left: 12px;
}

.search-field .input {
  padding-left: 38px;
}
</style>
