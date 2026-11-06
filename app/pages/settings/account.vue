<template>
  <div class="page">
    <h1 class="page-title">{{ $t("account.title") }}</h1>

    <form class="section" @submit.prevent="saveLanguages">
      <h2 class="section-title">{{ $t("account.languages") }}</h2>
      <LanguageFields v-model="languages" />
      <div class="row">
        <button type="submit" class="btn btn-primary" :disabled="languageFeedback.busy.value">
          {{ $t("common.save") }}
        </button>
        <Feedback :text="languageFeedback.text.value" :ok="languageFeedback.ok.value" />
      </div>
    </form>

    <section class="section">
      <h2 class="section-title">{{ $t("languages.interface") }}</h2>
      <div class="field">
        <label for="interface-language">{{ $t("languages.interface") }}</label>
        <div class="stack-tight">
          <select id="interface-language" class="select" :value="locale" @change="changeLocale">
            <option v-for="l in locales" :key="l.code" :value="l.code">{{ l.name }}</option>
          </select>
          <a class="hint" :href="TRANSLATING_URL" target="_blank" rel="noopener">{{
            $t("languages.helpTranslate")
          }}</a>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">OpenSubtitles.com</h2>
      <p class="muted">{{ $t("account.opensubtitles.intro") }}</p>
      <div v-if="me?.opensubtitles.connected" class="row">
        <i18n-t keypath="account.opensubtitles.signedInAs" tag="span">
          <template #name>
            <strong>{{ me.opensubtitles.username }}</strong>
          </template>
        </i18n-t>
        <button type="button" class="btn btn-danger" @click="disconnect">
          {{ $t("account.opensubtitles.disconnect") }}
        </button>
      </div>
      <form v-else class="stack" method="post" @submit.prevent="connect">
        <div>
          <div class="field">
            <label for="os-user">{{ $t("account.opensubtitles.username") }}</label>
            <input id="os-user" v-model.trim="os.username" class="input" autocomplete="username" required />
          </div>
          <div class="field">
            <label for="os-pass">{{ $t("account.opensubtitles.password") }}</label>
            <input
              id="os-pass"
              v-model="os.password"
              class="input"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
        </div>
        <div class="row">
          <button type="submit" class="btn btn-primary" :disabled="osFeedback.busy.value">
            {{
              osFeedback.busy.value
                ? $t("account.opensubtitles.checking")
                : $t("account.opensubtitles.connect")
            }}
          </button>
          <a href="https://www.opensubtitles.com/en/users/sign_up" target="_blank" rel="noopener">
            {{ $t("account.opensubtitles.signUp") }}
          </a>
        </div>
      </form>
      <Feedback :text="osFeedback.text.value" :ok="osFeedback.ok.value" />
      <i18n-t keypath="account.opensubtitles.credit" tag="p" class="hint">
        <template #site>
          <a href="https://www.opensubtitles.com" target="_blank" rel="noopener">OpenSubtitles.com</a>
        </template>
      </i18n-t>
    </section>

    <form class="section" @submit.prevent="saveAnki">
      <h2 class="section-title">Anki</h2>
      <i18n-t keypath="account.anki.intro" tag="p" class="muted">
        <template #origin>
          <code>{{ origin }}</code>
        </template>
        <template #setting>
          <code>webCorsOriginList</code>
        </template>
      </i18n-t>
      <div>
        <div class="field">
          <label for="anki-url">{{ $t("account.anki.address") }}</label>
          <input id="anki-url" v-model.trim="anki.url" class="input" type="url" required />
        </div>
        <div class="field">
          <label for="anki-deck">{{ $t("account.anki.deck") }}</label>
          <input id="anki-deck" v-model.trim="anki.deck" class="input" required />
        </div>
      </div>
      <div class="row">
        <button type="submit" class="btn btn-primary">{{ $t("common.save") }}</button>
        <button type="button" class="btn" @click="testAnki">{{ $t("account.anki.test") }}</button>
        <Feedback :text="ankiFeedback.text.value" :ok="ankiFeedback.ok.value" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ANKI_DEFAULTS } from "#shared/anki";
import type { Level } from "#shared/languages";

const TRANSLATING_URL = "https://learnarr.org/wiki/translating.html";

const { t, locale, locales, setLocale } = useI18n();
useHead({ title: () => `${t("account.title")} · ${t("nav.settings")} · Learnarr` });

const { me, refresh } = useMe();
// The same value on the server and in the browser, so the page hydrates cleanly.
const origin = useRequestURL().origin;

const languages = ref({
  learningLanguage: me.value?.learningLanguage ?? "es",
  nativeLanguage: me.value?.nativeLanguage ?? "en",
  level: (me.value?.level ?? "intermediate") as Level,
});
const languageFeedback = useFeedback();

function saveLanguages() {
  return languageFeedback.run(
    async () => {
      await api("/api/me", { method: "PUT", body: languages.value });
      await refresh();
      useDueCount().refresh();
    },
    () => t("common.saved"),
  );
}

async function changeLocale(event: Event) {
  const code = (event.target as HTMLSelectElement).value;
  await setLocale(code as typeof locale.value);
  await api("/api/me", { method: "PUT", body: { locale: code } }).catch(() => {});
}

const os = reactive({ username: "", password: "" });
const osFeedback = useFeedback();

function connect() {
  return osFeedback.run(
    async () => {
      const result = await api<OpenSubtitlesAccount>("/api/me/opensubtitles", {
        method: "PUT",
        body: { ...os },
      });
      os.password = "";
      await refresh();
      return result;
    },
    (result) =>
      result.allowedDownloads !== null
        ? t("account.opensubtitles.connectedWithAllowance", { count: result.allowedDownloads })
        : t("account.opensubtitles.connected"),
  );
}

function disconnect() {
  return osFeedback.run(async () => {
    await api("/api/me/opensubtitles", { method: "DELETE" });
    await refresh();
  });
}

const anki = reactive({
  url: me.value?.anki.url ?? ANKI_DEFAULTS.url,
  deck: me.value?.anki.deck ?? ANKI_DEFAULTS.deck,
});
const ankiFeedback = useFeedback();

function saveAnki() {
  return ankiFeedback.run(
    async () => {
      await api("/api/me", { method: "PUT", body: { ankiUrl: anki.url, ankiDeck: anki.deck } });
      await refresh();
    },
    () => t("common.saved"),
  );
}

function testAnki() {
  return ankiFeedback.run(
    () => useAnki().check(anki.url),
    (version) => t("account.anki.connected", { version }),
  );
}
</script>
