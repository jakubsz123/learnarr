<template>
  <span class="brand">
    <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path
        d="M9 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"
        fill="#15171c"
      />
      <path d="M11 12.5h10M11 16h6" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" />
    </svg>
    <span class="brand-name">Learnarr</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 28 });
</script>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.brand-name {
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
</style>
