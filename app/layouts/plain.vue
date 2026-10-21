<template>
  <div class="plain">
    <slot />
  </div>
</template>

<style scoped>
.plain {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px calc(32px + env(safe-area-inset-bottom));
  gap: 24px;
}
</style>
