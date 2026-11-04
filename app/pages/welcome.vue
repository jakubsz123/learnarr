<template>
  <BrandMark :size="36" />
  <form class="panel welcome stack" @submit.prevent="finish">
    <h1 class="page-title">{{ $t("welcome.title", { name: me?.name ?? "" }) }}</h1>
    <p class="muted">{{ $t("welcome.intro") }}</p>
    <LanguageFields v-model="languages" />
    <p class="hint">{{ $t("welcome.later") }}</p>
    <p v-if="error" class="danger" role="alert">{{ error }}</p>
    <button type="submit" class="btn btn-primary btn-block" :disabled="busy">
      {{ $t("welcome.start") }}
    </button>
  </form>
</template>

<script setup lang="ts">
import type { Level } from "#shared/languages";

definePageMeta({ layout: "plain" });
const { t, locale } = useI18n();
useHead({ title: () => `${t("welcome.pageTitle")} · Learnarr` });

const { me, refresh } = useMe();
const { errorText } = useErrorMessage();
const busy = ref(false);
const error = ref("");
const languages = ref({
  learningLanguage: me.value?.learningLanguage ?? "es",
  nativeLanguage: me.value?.nativeLanguage ?? "en",
  level: (me.value?.level ?? "intermediate") as Level,
});

async function finish() {
  busy.value = true;
  error.value = "";
  try {
    await api("/api/me", {
      method: "PUT",
      body: { ...languages.value, locale: locale.value, onboarded: true },
    });
    await refresh();
    await navigateTo("/");
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.welcome {
  width: 100%;
  max-width: 560px;
  padding: 24px 20px;
}
</style>
