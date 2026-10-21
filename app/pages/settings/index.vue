<template>
  <div class="page">
    <h1 class="page-title">Settings</h1>
    <nav class="menu" aria-label="Settings">
      <NuxtLink v-for="item in items" :key="item.to" :to="item.to" class="menu-row">
        <span class="stack" style="gap: 2px">
          <span>{{ item.label }}</span>
          <span class="hint">{{ item.hint }}</span>
        </span>
        <AppIcon name="next" :size="18" />
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
useHead({ title: "Settings · Learnarr" });
const { me } = useMe();
const items = computed(() => [
  { label: "Account", to: "/settings/account", hint: "Languages, OpenSubtitles, Anki" },
  ...(me.value?.isAdmin
    ? [
        { label: "Media server", to: "/settings/media-server", hint: "Plex or Jellyfin" },
        { label: "AI", to: "/settings/ai", hint: "The provider that picks words" },
        { label: "Users", to: "/settings/users", hint: "Your household" },
        { label: "System status", to: "/system/status", hint: "Connections and health" },
      ]
    : []),
]);
</script>

<style scoped>
.menu {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  text-decoration: none;
}

.menu-row:last-child {
  border-bottom: 0;
}
</style>
