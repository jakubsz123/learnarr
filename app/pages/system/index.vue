<template>
  <div />
</template>

<script setup lang="ts">
// System has one page so far; its own address goes there.
definePageMeta({ admin: true });
await navigateTo("/system/status", { replace: true });
</script>
