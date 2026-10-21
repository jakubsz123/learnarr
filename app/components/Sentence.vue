<template>
  <span class="sentence">
    <template v-for="(part, i) in parts" :key="i">
      <mark v-if="part.hit">{{ part.text }}</mark>
      <template v-else>{{ part.text }}</template>
    </template>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{ text: string; highlight?: string }>();

/** The sentence with the first occurrence of the word marked, ignoring case. */
const parts = computed(() => {
  const text = props.text.replace(/\n/g, " ");
  const needle = props.highlight?.trim();
  const at = needle ? text.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase()) : -1;
  if (!needle || at === -1) return [{ text, hit: false }];
  return [
    { text: text.slice(0, at), hit: false },
    { text: text.slice(at, at + needle.length), hit: true },
    { text: text.slice(at + needle.length), hit: false },
  ];
});
</script>

<style scoped>
mark {
  background: none;
  color: var(--accent-text);
  font-weight: 700;
}
</style>
