<template>
  <div class="shell">
    <header class="topbar">
      <NuxtLink to="/" class="topbar-brand" :aria-label="$t('nav.home')">
        <BrandMark />
      </NuxtLink>
      <div class="topbar-actions">
        <button type="button" class="icon-btn" :aria-label="themeLabel" :title="themeLabel" @click="cycle">
          <AppIcon :name="choice === 'dark' ? 'moon' : choice === 'light' ? 'sun' : 'auto'" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :aria-label="$t('nav.signOut')"
          :title="$t('nav.signOut')"
          @click="signOut"
        >
          <AppIcon name="logout" />
        </button>
      </div>
    </header>

    <div class="body">
      <nav class="sidebar" :aria-label="$t('nav.main')">
        <template v-for="item in nav" :key="item.to">
          <NuxtLink
            :to="item.to"
            class="nav-item"
            :class="{ 'is-active': item.active }"
            :aria-current="item.active && !item.children ? 'page' : undefined"
          >
            <AppIcon :name="item.icon" :size="18" />
            <span class="nav-label">{{ item.label }}</span>
            <span v-if="item.badge" class="badge">{{ item.badge }}</span>
          </NuxtLink>
          <template v-if="item.active && item.children">
            <NuxtLink
              v-for="child in item.children"
              :key="child.to"
              :to="child.to"
              class="nav-child"
              :class="{ 'is-active': route.path === child.to }"
              :aria-current="route.path === child.to ? 'page' : undefined"
            >
              {{ child.label }}
            </NuxtLink>
          </template>
        </template>
      </nav>

      <main class="main">
        <slot />
      </main>
    </div>

    <nav class="tabbar" :aria-label="$t('nav.main')">
      <NuxtLink
        v-for="item in tabs"
        :key="item.to"
        :to="item.to"
        class="tab"
        :class="{ 'is-active': item.active }"
        :aria-current="item.active ? 'page' : undefined"
      >
        <span class="tab-icon">
          <AppIcon :name="item.icon" :size="22" />
          <span v-if="item.badge" class="badge tab-badge">{{ item.badge }}</span>
        </span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { IconName } from "~/utils/icons";

const { t } = useI18n();
const route = useRoute();
const { me } = useMe();
const { choice, cycle } = useTheme();
const { count: dueCount, refresh: refreshDue } = useDueCount();

const themeLabel = computed(() => t(`nav.theme.${choice.value}`));

onMounted(refreshDue);
watch(() => route.path, refreshDue);

interface NavItem {
  label: string;
  icon: IconName;
  to: string;
  active: boolean;
  badge?: number | null;
  children?: { label: string; to: string }[];
}

const under = (prefix: string) => route.path === prefix || route.path.startsWith(`${prefix}/`);

const nav = computed<NavItem[]>(() => {
  const admin = me.value?.isAdmin === true;
  const settingsChildren = [
    { label: t("nav.account"), to: "/settings/account" },
    { label: t("nav.notifications"), to: "/settings/notifications" },
    ...(admin
      ? [
          { label: t("nav.mediaServer"), to: "/settings/media-server" },
          { label: t("nav.ai"), to: "/settings/ai" },
          { label: t("nav.users"), to: "/settings/users" },
        ]
      : []),
  ];
  return [
    { label: t("nav.today"), icon: "home", to: "/", active: route.path === "/" },
    {
      label: t("nav.library"),
      icon: "library",
      to: "/library",
      active: under("/library") || under("/media"),
    },
    {
      label: t("nav.study"),
      icon: "study",
      to: "/study",
      active: under("/study"),
      badge: dueCount.value || null,
    },
    { label: t("nav.cards"), icon: "cards", to: "/cards", active: under("/cards") },
    {
      label: t("nav.settings"),
      icon: "settings",
      to: "/settings/account",
      active: under("/settings"),
      children: settingsChildren,
    },
    ...(admin
      ? [
          {
            label: t("nav.system"),
            icon: "system" as const,
            to: "/system/status",
            active: under("/system"),
            children: [{ label: t("nav.status"), to: "/system/status" }],
          },
        ]
      : []),
  ];
});

const tabs = computed<NavItem[]>(() => [
  ...nav.value.slice(0, 4),
  {
    label: t("nav.settings"),
    icon: "settings",
    to: "/settings",
    active: under("/settings") || under("/system"),
  },
]);

async function signOut() {
  await authClient.signOut();
  useMe().me.value = null;
  await navigateTo("/login");
}
</script>

<style scoped>
.shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  height: var(--topbar-h);
  padding: 0 8px 0 16px;
  padding-top: env(safe-area-inset-top);
  box-sizing: content-box;
  background: var(--chrome);
  color: var(--chrome-text);
}

.topbar-brand {
  text-decoration: none;
}

.topbar-actions {
  margin-left: auto;
  display: flex;
}

.icon-btn {
  width: var(--tap);
  height: var(--tap);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--chrome-text);
  cursor: pointer;
}

.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sidebar {
  display: none;
}

.main {
  flex: 1;
  min-width: 0;
  padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
}

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--chrome);
  border-top: 1px solid var(--chrome-edge);
}

.tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--chrome-muted);
  font-size: 12px;
  text-decoration: none;
}

.tab.is-active {
  color: var(--accent);
}

.tab-icon {
  position: relative;
  display: inline-flex;
}

.tab-badge {
  position: absolute;
  top: -6px;
  left: 14px;
  height: 17px;
  min-width: 17px;
  font-size: 11px;
}

@media (min-width: 900px) {
  .sidebar {
    display: flex;
    flex-direction: column;
    flex: 0 0 220px;
    padding: 6px 0;
    background: var(--sidebar);
    position: sticky;
    top: var(--topbar-h);
    height: calc(100vh - var(--topbar-h));
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: var(--tap);
    padding: 0 16px;
    border-left: 3px solid transparent;
    color: var(--sidebar-text);
    text-decoration: none;
  }

  .nav-item.is-active {
    background: var(--sidebar-active);
    border-left-color: var(--accent);
    color: var(--chrome-strong);
    font-weight: 500;
  }

  .nav-label {
    flex: 1;
  }

  .nav-child {
    display: flex;
    align-items: center;
    min-height: 36px;
    padding: 0 16px 0 51px;
    border-left: 3px solid var(--accent);
    color: var(--sidebar-text);
    font-size: 14px;
    text-decoration: none;
  }

  /* Lighter than the accent: plain coral on the sidebar falls short of AA contrast. */
  .nav-child.is-active {
    color: var(--chrome-accent);
    font-weight: 500;
  }

  .main {
    padding-bottom: 0;
  }

  .tabbar {
    display: none;
  }
}
</style>
