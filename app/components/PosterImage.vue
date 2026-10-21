<template>
  <div class="poster">
    <img
      v-if="hasPoster && !failed"
      :src="`/api/media/${encodeURIComponent(id)}/poster?w=${width}`"
      :alt="alt"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else class="poster-fallback" aria-hidden="true">
      <AppIcon name="film" :size="28" />
    </span>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ id: string; alt: string; hasPoster?: boolean; width?: number }>(), {
  hasPoster: true,
  width: 300,
});
const failed = ref(false);
</script>

<style scoped>
.poster {
  aspect-ratio: 2 / 3;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface-2);
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}
</style>
