<template>
  <BrandMark :size="36" />

  <ol class="steps" aria-label="Setup steps">
    <li
      v-for="(label, i) in STEPS"
      :key="label"
      class="step"
      :class="{ 'is-current': i === step, 'is-done': i < step }"
      :aria-current="i === step ? 'step' : undefined"
    >
      <span class="step-dot" aria-hidden="true">{{ i < step ? "✓" : i + 1 }}</span>
      {{ label }}
    </li>
  </ol>

  <section class="panel wizard" :aria-labelledby="`step-title`">
    <form v-if="step === 0" class="stack" @submit.prevent="createAccount">
      <h1 id="step-title">Welcome to Learnarr</h1>
      <p class="muted">
        Create the admin account for this server. You'll add the rest of your household later.
      </p>
      <label class="stack-label"
        >Name<input v-model.trim="account.name" class="input" autocomplete="name" required
      /></label>
      <label class="stack-label">
        Email<input v-model.trim="account.email" class="input" type="email" autocomplete="email" required />
      </label>
      <label class="stack-label">
        Password
        <input
          v-model="account.password"
          class="input"
          type="password"
          autocomplete="new-password"
          minlength="8"
          placeholder="At least 8 characters"
          required
        />
      </label>
      <p v-if="error" class="danger" role="alert">{{ error }}</p>
      <div class="nav">
        <span />
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? "Creating…" : "Create account" }}
        </button>
      </div>
    </form>

    <div v-else-if="step === 1" class="stack">
      <h1 id="step-title">Connect your media server</h1>
      <p class="muted">
        Learnarr reads your library and the subtitles that come with it. Everyone here shares it.
      </p>
      <MediaServerForm @connected="mediaConnected = true" />
      <div class="nav">
        <span />
        <button type="button" class="btn" :class="{ 'btn-primary': mediaConnected }" @click="step = 2">
          {{ mediaConnected ? "Continue" : "Skip for now" }}
        </button>
      </div>
    </div>

    <div v-else-if="step === 2" class="stack">
      <h1 id="step-title">Pick an AI provider</h1>
      <p class="muted">
        It picks the words worth learning and translates them. Use a cloud model or run one yourself.
      </p>
      <AiProviderForm ref="aiForm" />
      <p v-if="error" class="danger" role="alert">{{ error }}</p>
      <div class="nav">
        <button type="button" class="btn" @click="back">Back</button>
        <div class="row">
          <button type="button" class="btn" @click="step = 3">Skip for now</button>
          <button type="button" class="btn btn-primary" :disabled="busy" @click="saveAi">
            {{ busy ? "Saving…" : "Continue" }}
          </button>
        </div>
      </div>
    </div>

    <form v-else-if="step === 3" class="stack" @submit.prevent="saveLanguages">
      <h1 id="step-title">Your languages</h1>
      <p class="muted">Everyone in the household picks their own; these are yours.</p>
      <LanguageFields v-model="languages" />
      <p v-if="error" class="danger" role="alert">{{ error }}</p>
      <div class="nav">
        <button type="button" class="btn" @click="back">Back</button>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? "Saving…" : "Finish" }}
        </button>
      </div>
    </form>

    <div v-else class="stack">
      <h1 id="step-title">You're set</h1>
      <p class="muted">Pick a show from your library, get its words and start studying.</p>
      <div class="row">
        <NuxtLink to="/library" class="btn btn-primary">Open the library</NuxtLink>
        <NuxtLink to="/settings/users" class="btn">Add household members</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { LanguageChoice } from "~/components/LanguageFields.vue";

definePageMeta({ layout: "plain" });
useHead({ title: "Set up Learnarr" });

const STEPS = ["Account", "Media server", "AI", "Languages"];

const { me, refresh } = useMe();
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
    error.value = result.error.message || "Couldn't create the account.";
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

const languages = ref<LanguageChoice>({
  learningLanguage: me.value?.learningLanguage ?? "es",
  nativeLanguage: me.value?.nativeLanguage ?? "en",
  level: me.value?.level ?? "intermediate",
});

async function saveLanguages() {
  busy.value = true;
  error.value = "";
  try {
    await $fetch("/api/me", { method: "PUT", body: languages.value });
    await refresh();
    step.value = 4;
  } catch (e) {
    error.value = errorMessage(e);
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
