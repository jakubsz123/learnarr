<template>
  <span v-if="text" :class="ok ? 'ok' : 'danger'" :role="ok ? 'status' : 'alert'">{{ text }}</span>
</template>

<script setup lang="ts">
/** Shows a useFeedback() result. */
defineProps<{ text: string; ok: boolean }>();
</script>
