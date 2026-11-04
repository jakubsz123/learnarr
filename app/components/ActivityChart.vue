<template>
  <figure class="activity">
    <figcaption class="hint" aria-live="polite">
      {{
        picked
          ? $t("activity.day", { date: dateText(picked.date), count: picked.count })
          : $t("activity.caption", { count: total })
      }}
    </figcaption>
    <div
      class="grid"
      role="group"
      :aria-label="$t('activity.label', { count: total, days: activity.length })"
    >
      <button
        v-for="day in activity"
        :key="day.date"
        type="button"
        class="day"
        :class="[`level-${level(day.count)}`, { picked: picked?.date === day.date }]"
        :aria-label="$t('activity.day', { date: dateText(day.date), count: day.count })"
        @click="picked = picked?.date === day.date ? null : day"
      />
    </div>
  </figure>
</template>

<script setup lang="ts">
/** Reviews a day as a grid of squares, a week to a column, oldest first. Tap a day for its count. */
const props = defineProps<{ activity: { date: string; count: number }[] }>();

const { locale } = useI18n();
const picked = ref<{ date: string; count: number } | null>(null);
const total = computed(() => props.activity.reduce((sum, day) => sum + day.count, 0));
const busiest = computed(() => Math.max(1, ...props.activity.map((day) => day.count)));

function level(count: number) {
  return count === 0 ? 0 : Math.min(4, Math.ceil((count / busiest.value) * 4));
}

/** The server's calendar date, shown as it is whatever the browser's time zone. */
function dateText(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale.value, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
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
  grid-template-rows: repeat(7, 14px);
  grid-auto-flow: column;
  grid-auto-columns: 14px;
  gap: 3px;
  overflow-x: auto;
}

.day {
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: var(--surface-2);
  cursor: pointer;
}

.day.picked {
  outline: 2px solid var(--text);
  outline-offset: 1px;
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
