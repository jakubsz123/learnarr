<template>
  <div />
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
await navigateTo("/system/status", { replace: true });
</script>
