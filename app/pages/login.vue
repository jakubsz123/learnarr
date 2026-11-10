<template>
  <BrandMark :size="36" />
  <!-- POST, so a tap before the page is ready never puts the password in the address. -->
  <form class="panel login" method="post" @submit.prevent="signIn">
    <h1 class="page-title">{{ $t("signIn.title") }}</h1>
    <label class="stack-label">
      {{ $t("signIn.username") }}
      <input
        v-model.trim="username"
        class="input"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        required
      />
    </label>
    <label class="stack-label">
      {{ $t("signIn.password") }}
      <input v-model="password" class="input" type="password" autocomplete="current-password" required />
    </label>
    <p v-if="error" class="danger" role="alert">{{ error }}</p>
    <button type="submit" class="btn btn-primary btn-block" :disabled="busy">
      {{ busy ? $t("signIn.busy") : $t("signIn.submit") }}
    </button>
    <p class="hint">{{ $t("signIn.noAccount") }}</p>
  </form>
</template>

<script setup lang="ts">
import { signInEmail } from "#shared/username";
definePageMeta({ layout: "plain" });
const { t } = useI18n();
useHead({ title: () => `${t("signIn.title")} · Learnarr` });

const route = useRoute();
const username = ref("");
const password = ref("");
const busy = ref(false);
const error = ref("");

/** Only a path on this server: "//host" or "/\host" would leave it. */
function safeRedirect(value: unknown): string {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/";
}

async function signIn() {
  busy.value = true;
  error.value = "";
  const result = await authClient.signIn.email({
    email: signInEmail(username.value),
    password: password.value,
  });
  busy.value = false;
  if (result.error) {
    error.value = authErrorMessage(result.error, t);
    return;
  }
  await useMe().refresh();
  await navigateTo(safeRedirect(route.query.redirect));
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
