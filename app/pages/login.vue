<template>
  <BrandMark :size="36" />
  <form class="panel login" @submit.prevent="signIn">
    <h1 class="page-title">Sign in</h1>
    <label class="stack-label">
      Email
      <input v-model.trim="email" class="input" type="email" autocomplete="email" required />
    </label>
    <label class="stack-label">
      Password
      <input v-model="password" class="input" type="password" autocomplete="current-password" required />
    </label>
    <p v-if="error" class="danger" role="alert">{{ error }}</p>
    <button type="submit" class="btn btn-primary btn-block" :disabled="busy">
      {{ busy ? "Signing in…" : "Sign in" }}
    </button>
    <p class="hint">No account? Ask whoever runs this server to add you.</p>
  </form>
</template>

<script setup lang="ts">
definePageMeta({ layout: "plain" });
useHead({ title: "Sign in · Learnarr" });

const route = useRoute();
const email = ref("");
const password = ref("");
const busy = ref(false);
const error = ref("");

async function signIn() {
  busy.value = true;
  error.value = "";
  const result = await authClient.signIn.email({ email: email.value, password: password.value });
  busy.value = false;
  if (result.error) {
    error.value = result.error.message || "That email and password don't match an account.";
    return;
  }
  await useMe().refresh();
  const redirect =
    typeof route.query.redirect === "string" && route.query.redirect.startsWith("/")
      ? route.query.redirect
      : "/";
  await navigateTo(redirect);
}
</script>

<style scoped>
.login {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
