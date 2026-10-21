<template>
  <div class="page">
    <h1 class="page-title">Account</h1>

    <form class="section" @submit.prevent="saveLanguages">
      <h2 class="section-title">Languages</h2>
      <LanguageFields v-model="languages" />
      <div class="row">
        <button type="submit" class="btn btn-primary" :disabled="busy">Save</button>
        <span v-if="languageMessage" class="ok" role="status">{{ languageMessage }}</span>
      </div>
    </form>

    <section class="section">
      <h2 class="section-title">OpenSubtitles.com</h2>
      <p class="muted">
        When your media server has no subtitle in your language, Learnarr downloads one with your own free
        OpenSubtitles.com account, on its daily allowance.
      </p>
      <div v-if="me?.opensubtitles.connected" class="row">
        <span
          >Signed in as <strong>{{ me.opensubtitles.username }}</strong></span
        >
        <button type="button" class="btn btn-danger" @click="disconnect">Disconnect</button>
      </div>
      <form v-else class="stack" @submit.prevent="connect">
        <label class="stack-label">
          Username
          <input v-model.trim="os.username" class="input" autocomplete="username" required />
        </label>
        <label class="stack-label">
          Password
          <input
            v-model="os.password"
            class="input"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>
        <div class="row">
          <button type="submit" class="btn btn-primary" :disabled="busy">
            {{ busy ? "Checking…" : "Connect" }}
          </button>
          <a href="https://www.opensubtitles.com/en/users/sign_up" target="_blank" rel="noopener"
            >Create a free account</a
          >
        </div>
      </form>
      <p v-if="osMessage" :class="osOk ? 'ok' : 'danger'" role="status">{{ osMessage }}</p>
      <p class="hint">
        Subtitles provided by
        <a href="https://www.opensubtitles.com" target="_blank" rel="noopener">OpenSubtitles.com</a>.
      </p>
    </section>

    <form class="section" @submit.prevent="saveAnki">
      <h2 class="section-title">Anki</h2>
      <p class="muted">
        Send your cards to Anki on your computer with the AnkiConnect add-on. Add
        <code>{{ origin }}</code> to its <code>webCorsOriginList</code> (Anki → Tools → Add-ons → AnkiConnect
        → Config).
      </p>
      <div>
        <div class="field">
          <label for="anki-url">AnkiConnect address</label>
          <input id="anki-url" v-model.trim="anki.url" class="input" type="url" required />
        </div>
        <div class="field">
          <label for="anki-deck">Deck</label>
          <input id="anki-deck" v-model.trim="anki.deck" class="input" required />
        </div>
      </div>
      <div class="row">
        <button type="submit" class="btn btn-primary">Save</button>
        <button type="button" class="btn" @click="testAnki">Test</button>
        <span v-if="ankiMessage" :class="ankiOk ? 'ok' : 'danger'" role="status">{{ ankiMessage }}</span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { LanguageChoice } from "~/components/LanguageFields.vue";

useHead({ title: "Account · Settings · Learnarr" });

const { me, refresh } = useMe();
const origin = import.meta.client ? window.location.origin : "";
const busy = ref(false);

const languages = ref<LanguageChoice>({
  learningLanguage: me.value?.learningLanguage ?? "es",
  nativeLanguage: me.value?.nativeLanguage ?? "en",
  level: me.value?.level ?? "intermediate",
});
const languageMessage = ref("");

async function saveLanguages() {
  await $fetch("/api/me", { method: "PUT", body: languages.value });
  await refresh();
  useDueCount().refresh();
  languageMessage.value = "Saved.";
}

const os = reactive({ username: "", password: "" });
const osMessage = ref("");
const osOk = ref(false);

async function connect() {
  busy.value = true;
  osMessage.value = "";
  try {
    const result = await $fetch<{ allowedDownloads: number | null }>("/api/me/opensubtitles", {
      method: "PUT",
      body: { ...os },
    });
    os.password = "";
    osMessage.value =
      result.allowedDownloads !== null
        ? `Connected · ${result.allowedDownloads} downloads a day.`
        : "Connected.";
    osOk.value = true;
    await refresh();
  } catch (e) {
    osMessage.value = errorMessage(e);
    osOk.value = false;
  } finally {
    busy.value = false;
  }
}

async function disconnect() {
  await $fetch("/api/me/opensubtitles", { method: "DELETE" });
  osMessage.value = "";
  await refresh();
}

const anki = reactive({
  url: me.value?.anki.url ?? "http://127.0.0.1:8765",
  deck: me.value?.anki.deck ?? "Learnarr",
});
const ankiMessage = ref("");
const ankiOk = ref(false);

async function saveAnki() {
  try {
    await $fetch("/api/me", { method: "PUT", body: { ankiUrl: anki.url, ankiDeck: anki.deck } });
    await refresh();
    ankiMessage.value = "Saved.";
    ankiOk.value = true;
  } catch (e) {
    ankiMessage.value = errorMessage(e);
    ankiOk.value = false;
  }
}

async function testAnki() {
  ankiMessage.value = "";
  try {
    const version = await useAnki().check(anki.url);
    ankiMessage.value = `Connected to AnkiConnect (version ${version}).`;
    ankiOk.value = true;
  } catch (e) {
    ankiMessage.value = errorMessage(e);
    ankiOk.value = false;
  }
}
</script>
