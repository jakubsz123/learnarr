<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<script setup lang="ts">
const ICONS: Record<string, string[]> = {
  library: ["M3 4h7v7H3z", "M14 4h7v7h-7z", "M3 15h7v6H3z", "M14 15h7v6h-7z"],
  study: ["M13 2 4 14h7l-1 8 9-12h-7z"],
  cards: ["M4 7h13v13H4z", "M8 3h12v12"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  ],
  system: ["M3 12h4l3-7 4 14 3-7h4"],
  sun: [
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5",
  ],
  moon: ["M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"],
  auto: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 3v18"],
  logout: ["M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4", "M10 17l-5-5 5-5", "M5 12h11"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-4-4"],
  back: ["M15 18l-6-6 6-6"],
  next: ["M9 18l6-6-6-6"],
  check: ["M5 12l5 5L20 7"],
  x: ["M6 6l12 12M18 6 6 18"],
  trash: ["M4 7h16", "M10 11v6M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
  pause: ["M9 5v14M15 5v14"],
  play: ["M7 4l13 8-13 8z"],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 4v7h-7"],
  plus: ["M12 5v14M5 12h14"],
  anki: ["M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z"],
  film: ["M4 4h16v16H4z", "M8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4"],
};

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 });
const paths = computed(() => ICONS[props.name] ?? []);
</script>
