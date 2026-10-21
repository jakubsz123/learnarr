<template>
  <span class="coverage" :class="[tier?.id ?? 'none', size]" :title="title">
    <svg :width="px" :height="px" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" class="track" />
      <circle
        v-if="coverage !== null"
        cx="18"
        cy="18"
        r="15"
        class="fill"
        :stroke-dasharray="`${dash} 100`"
        pathLength="100"
        transform="rotate(-90 18 18)"
      />
    </svg>
    <span class="value">{{ formatCoverage(coverage) }}</span>
    <span v-if="size === 'lg'" class="label">{{ tier?.label ?? emptyLabel }}</span>
    <span class="sr-only">{{ title }}</span>
  </span>
</template>

<script setup lang="ts">
import { coverageTier, formatCoverage } from "#shared/coverage";

const props = withDefaults(
  defineProps<{ coverage: number | null; size?: "sm" | "lg"; emptyLabel?: string }>(),
  { size: "sm", emptyLabel: "Not scored yet" },
);

const tier = computed(() => coverageTier(props.coverage));
const px = computed(() => (props.size === "lg" ? 44 : 22));
const dash = computed(() => Math.floor((props.coverage ?? 0) * 100));
const title = computed(() =>
  props.coverage === null
    ? `You know: ${props.emptyLabel.toLowerCase()}`
    : `You know ${formatCoverage(props.coverage)} of the words: ${tier.value?.label.toLowerCase()}`,
);
</script>

<style scoped>
.coverage {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.coverage.lg {
  display: grid;
  grid-template-columns: auto auto;
  grid-template-rows: auto auto;
  column-gap: 10px;
  align-items: center;
}

.coverage.lg svg {
  grid-row: span 2;
}

.coverage.lg .value {
  font-size: 20px;
  font-weight: 500;
  line-height: 1.1;
}

.label {
  font-size: 13px;
  color: var(--muted);
}

.track {
  fill: none;
  stroke: var(--surface-2);
  stroke-width: 5;
}

.fill {
  fill: none;
  stroke-width: 5;
  stroke-linecap: round;
  stroke: var(--tier);
}

.value {
  color: var(--tier, var(--muted));
  font-weight: 500;
}

.easy,
.ideal {
  --tier: var(--ok);
}

.stretch {
  --tier: var(--warn);
}

.hard {
  --tier: var(--danger);
}
</style>
