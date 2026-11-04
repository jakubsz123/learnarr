<template>
  <BrandMark :size="36" />

  <ol class="steps" :aria-label="$t('setup.steps')">
    <li
      v-for="(name, i) in STEPS"
      :key="name"
      class="step"
      :class="{ 'is-current': i === step, 'is-done': i < step }"
      :aria-current="i === step ? 'step' : undefined"
    >
      <span class="step-dot" aria-hidden="true">{{ i < step ? "✓" : i + 1 }}</span>
      {{ $t(`setup.stepNames.${name}`) }}
    </li>
  </ol>

  <section class="panel wizard" aria-labelledby="step-title">
    <form v-if="step === 0" class="stack" method="post" @submit.prevent="createAccount">
      <h1 id="step-title">{{ $t("setup.account.title") }}</h1>
      <p class="muted">{{ $t("setup.account.intro") }}</p>
      <label class="stack-label">
        {{ $t("setup.account.name") }}
        <input v-model.trim="account.name" class="input" autocomplete="name" required />
      </label>
      <label class="stack-label">
        {{ $t("signIn.email") }}
        <input v-model.trim="account.email" class="input" type="email" autocomplete="email" required />
      </label>
      <label class="stack-label">
        {{ $t("signIn.password") }}
        <input
          v-model="account.password"
          class="input"
          type="password"
          autocomplete="new-password"
          minlength="8"
          :placeholder="$t('setup.account.passwordHint')"
          required
        />
      </label>
      <p v-if="error" class="danger" role="alert">{{ error }}</p>
      <div class="nav">
        <span />
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? $t("setup.account.creating") : $t("setup.account.create") }}
        </button>
      </div>
    </form>

    <div v-else-if="step === 1" class="stack">
      <h1 id="step-title">{{ $t("setup.media.title") }}</h1>
      <p class="muted">{{ $t("setup.media.intro") }}</p>
      <MediaServerForm @connected="mediaConnected = true" />
      <div class="nav">
        <span />
        <button type="button" class="btn" :class="{ 'btn-primary': mediaConnected }" @click="step = 2">
          {{ mediaConnected ? $t("setup.continue") : $t("setup.skip") }}
        </button>
      </div>
    </div>

    <div v-else-if="step === 2" class="stack">
      <h1 id="step-title">{{ $t("setup.ai.title") }}</h1>
      <p class="muted">{{ $t("setup.ai.intro") }}</p>
      <AiProviderForm ref="aiForm" />
      <p v-if="error" class="danger" role="alert">{{ error }}</p>
      <div class="nav">
        <button type="button" class="btn" @click="back">{{ $t("common.back") }}</button>
        <div class="row">
          <button type="button" class="btn" @click="step = 3">{{ $t("setup.skip") }}</button>
          <button type="button" class="btn btn-primary" :disabled="busy" @click="saveAi">
            {{ busy ? $t("setup.saving") : $t("setup.continue") }}
          </button>
        </div>
      </div>
    </div>

    <form v-else-if="step === 3" class="stack" @submit.prevent="saveLanguages">
      <h1 id="step-title">{{ $t("setup.languages.title") }}</h1>
      <p class="muted">{{ $t("setup.languages.intro") }}</p>
      <LanguageFields v-model="languages" />
      <p v-if="error" class="danger" role="alert">{{ error }}</p>
      <div class="nav">
        <button type="button" class="btn" @click="back">{{ $t("common.back") }}</button>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? $t("setup.saving") : $t("setup.finish") }}
        </button>
      </div>
    </form>

    <div v-else class="stack">
      <h1 id="step-title">{{ $t("setup.done.title") }}</h1>
      <p class="muted">{{ $t("setup.done.intro") }}</p>
      <div class="row">
        <NuxtLink to="/library" class="btn btn-primary">{{ $t("setup.done.library") }}</NuxtLink>
        <NuxtLink to="/settings/users" class="btn">{{ $t("setup.done.household") }}</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Level } from "#shared/languages";

definePageMeta({ layout: "plain" });
const { t, locale } = useI18n();
useHead({ title: () => t("setup.pageTitle") });

const STEPS = ["account", "media", "ai", "languages"] as const;

const { me, refresh } = useMe();
const { errorText } = useErrorMessage();
const step = ref(me.value ? 1 : 0);
const busy = ref(false);
const error = ref("");
const mediaConnected = ref(false);

function back() {
  error.value = "";
  step.value = Math.max(1, step.value - 1);
}

const account = reactive({ name: "", email: "", password: "" });

async function createAccount() {
  busy.value = true;
  error.value = "";
  const result = await authClient.signUp.email({ ...account });
  busy.value = false;
  if (result.error) {
    error.value = authErrorMessage(result.error, t);
    return;
  }
  account.password = "";
  useState("setup-done").value = true;
  await refresh();
  step.value = 1;
}

const aiForm = ref<{ save: () => Promise<string | null> } | null>(null);

async function saveAi() {
  if (!aiForm.value) return;
  busy.value = true;
  error.value = (await aiForm.value.save()) ?? "";
  busy.value = false;
  if (!error.value) step.value = 3;
}

const languages = ref({
  learningLanguage: me.value?.learningLanguage ?? "es",
  nativeLanguage: me.value?.nativeLanguage ?? "en",
  level: (me.value?.level ?? "intermediate") as Level,
});

async function saveLanguages() {
  busy.value = true;
  error.value = "";
  try {
    await api("/api/me", {
      method: "PUT",
      body: { ...languages.value, locale: locale.value, onboarded: true },
    });
    await refresh();
    step.value = 4;
  } catch (e) {
    error.value = errorText(e);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px 0 6px;
  border-radius: 18px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
}

.step.is-current {
  background: var(--surface-2);
  color: var(--text);
}

.step.is-done {
  color: var(--text);
}

.step-dot {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--surface-2);
}

.step.is-current .step-dot,
.step.is-done .step-dot {
  background: var(--accent);
  color: var(--on-accent);
}

.wizard {
  width: 100%;
  max-width: 640px;
  padding: 24px 20px;
}

.wizard h1 {
  font-size: 24px;
  font-weight: 700;
}

.nav {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
</style>
