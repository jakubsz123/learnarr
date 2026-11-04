<template>
  <div class="page">
    <h1 class="page-title">{{ $t("nav.settings") }}</h1>
    <nav :aria-label="$t('nav.settings')">
      <ul class="list-box">
        <li v-for="item in items" :key="item.to">
          <NuxtLink :to="item.to" class="menu-row">
            <span class="stack-tight">
              <span>{{ item.label }}</span>
              <span class="hint">{{ item.hint }}</span>
            </span>
            <AppIcon name="next" :size="18" />
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
/** On a phone, the Settings tab opens this list; the sidebar shows the same pages on a wide screen. */
const { t } = useI18n();
useHead({ title: () => `${t("nav.settings")} · Learnarr` });
const { me } = useMe();
const items = computed(() => [
  { label: t("nav.account"), to: "/settings/account", hint: t("settingsMenu.account") },
  { label: t("nav.notifications"), to: "/settings/notifications", hint: t("settingsMenu.notifications") },
  ...(me.value?.isAdmin
    ? [
        { label: t("nav.mediaServer"), to: "/settings/media-server", hint: t("settingsMenu.mediaServer") },
        { label: t("nav.ai"), to: "/settings/ai", hint: t("settingsMenu.ai") },
        { label: t("nav.users"), to: "/settings/users", hint: t("settingsMenu.users") },
        { label: t("settingsMenu.status"), to: "/system/status", hint: t("settingsMenu.statusHint") },
      ]
    : []),
]);
</script>

<style scoped>
.menu-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 60px;
  padding: 8px 14px;
  text-decoration: none;
}
</style>
