<template>
  <header class="media-header">
    <PosterImage :id="posterId" :alt="title" :has-poster="hasPoster" :width="240" class="poster" />
    <div class="stack-tight">
      <slot name="eyebrow" />
      <h1 class="page-title">{{ title }}</h1>
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
/** A show's, film's or episode's poster with its title and whatever goes under it. */
defineProps<{ posterId: string; title: string; hasPoster: boolean }>();
</script>

<style scoped>
.media-header {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.poster {
  flex: 0 0 96px;
}

@media (min-width: 700px) {
  .poster {
    flex-basis: 140px;
  }
}
</style>
