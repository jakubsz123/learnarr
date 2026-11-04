<template>
  <figure class="activity">
    <figcaption class="hint">{{ $t("activity.caption", { count: total }) }}</figcaption>
    <div class="grid" role="img" :aria-label="$t('activity.label', { count: total, days: activity.length })">
      <span
        v-for="(n, i) in activity"
        :key="i"
        class="day"
        :class="`level-${level(n)}`"
        :title="$t('activity.day', { date: dateOf(i), count: n })"
      />
    </div>
  </figure>
</template>

<script setup lang="ts">
/** Reviews a day as a grid of squares, a week to a column, oldest first. */
const props = defineProps<{ activity: number[]; since: number }>();

const { locale } = useI18n();
const total = computed(() => props.activity.reduce((a, b) => a + b, 0));
const busiest = computed(() => Math.max(1, ...props.activity));

function level(n: number) {
  return n === 0 ? 0 : Math.min(4, Math.ceil((n / busiest.value) * 4));
}

function dateOf(index: number) {
  const day = new Date(props.since);
  day.setDate(day.getDate() + index);
  return day.toLocaleDateString(locale.value, { day: "numeric", month: "short" });
}
</script>

<style scoped>
.activity {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.grid {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  grid-auto-flow: column;
  grid-auto-columns: 12px;
  gap: 3px;
  overflow-x: auto;
}

.day {
  border-radius: 2px;
  background: var(--surface-2);
}

.level-1 {
  background: color-mix(in srgb, var(--accent) 30%, var(--surface-2));
}

.level-2 {
  background: color-mix(in srgb, var(--accent) 55%, var(--surface-2));
}

.level-3 {
  background: color-mix(in srgb, var(--accent) 80%, var(--surface-2));
}

.level-4 {
  background: var(--accent);
}
</style>
