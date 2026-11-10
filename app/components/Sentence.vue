<template>
  <span class="sentence"
    >{{ parts.before }}<mark v-if="parts.word">{{ parts.word }}</mark
    >{{ parts.after }}</span
  >
</template>

<script setup lang="ts">
import { splitAround } from "#shared/sentence";

/** A line with the first use of a word highlighted. */
const props = defineProps<{ text: string; highlight?: string | null }>();
const parts = computed(() => splitAround(props.text, props.highlight));
</script>

<style scoped>
mark {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  color: inherit;
  font-weight: 700;
  padding: 0 0.15em;
  border-radius: 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
</style>
