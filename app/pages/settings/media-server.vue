<template>
  <div class="page">
    <div class="section">
      <h1 class="page-title">Media server</h1>
      <p class="muted">
        The household's Plex or Jellyfin. Everyone on this Learnarr browses it and gets subtitles from it.
      </p>
    </div>
    <MediaServerForm />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
useHead({ title: "Media server · Settings · Learnarr" });
</script>
