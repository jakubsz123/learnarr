<template>
  <div v-if="links.length" class="support-links">
    <a v-for="link in links" :key="link.href" :href="link.href" class="support-link" rel="noopener">
      {{ link.label }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { useData } from "vitepress";

// Set in .vitepress/config.ts (themeConfig.support); an empty address hides its button.
const { theme } = useData();
const links = [
  { label: "☕ Buy me a coffee", href: theme.value.support?.coffee },
  { label: "♥ Sponsor on GitHub", href: theme.value.support?.github },
].filter((link): link is { label: string; href: string } => Boolean(link.href));
</script>

<style scoped>
.support-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 24px 0;
}

.support-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 6px;
  background: var(--vp-button-brand-bg);
  color: var(--vp-button-brand-text) !important;
  font-weight: 600;
  text-decoration: none !important;
}

.support-link:hover {
  background: var(--vp-button-brand-hover-bg);
}
</style>
