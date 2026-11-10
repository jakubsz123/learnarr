<template>
  <div class="page">
    <h1 class="page-title">{{ $t("notificationSettings.title") }}</h1>
    <p class="muted">{{ $t("notificationSettings.intro") }}</p>

    <template v-if="settings">
      <section class="section">
        <h2 class="section-title">{{ $t("notificationSettings.when") }}</h2>
        <p v-if="!hasChannel" class="hint">{{ $t("notificationSettings.whenLocked") }}</p>
        <fieldset class="when" :disabled="!hasChannel">
          <label class="toggle">
            <input v-model="form.practiceReminders" type="checkbox" @change="save" />
            {{ $t("notificationSettings.practice", { hour: hourLabel }) }}
          </label>
          <label class="toggle">
            <input v-model="form.watchReminders" type="checkbox" @change="save" />
            {{ $t("notificationSettings.watch") }}
          </label>
          <div v-if="form.watchReminders" class="field">
            <label for="media-user">{{ $t("notificationSettings.mediaUser") }}</label>
            <div class="stack-tight">
              <input id="media-user" v-model.trim="form.mediaServerUser" class="input" @change="save" />
              <span class="hint">{{ $t("notificationSettings.mediaUserHint") }}</span>
            </div>
          </div>
        </fieldset>
      </section>

      <section class="section">
        <h2 class="section-title">{{ $t("notificationSettings.thisDevice") }}</h2>
        <p class="muted">{{ $t("notificationSettings.pushIntro") }}</p>
        <div class="row">
          <button
            v-if="!push.subscribed.value"
            type="button"
            class="btn btn-primary"
            :disabled="pushFeedback.busy.value"
            @click="enablePush"
          >
            <AppIcon name="bell" :size="18" /> {{ $t("notificationSettings.enablePush") }}
          </button>
          <button v-else type="button" class="btn" :disabled="pushFeedback.busy.value" @click="disablePush">
            {{ $t("notificationSettings.disablePush") }}
          </button>
          <span v-if="settings.pushDevices" class="hint">
            {{ $t("notificationSettings.devices", { count: settings.pushDevices }) }}
          </span>
        </div>
        <Feedback :text="pushFeedback.text.value" :ok="pushFeedback.ok.value" />
      </section>

      <section class="section">
        <h2 class="section-title">ntfy</h2>
        <i18n-t keypath="notificationSettings.ntfyIntro" tag="p" class="muted">
          <template #app>
            <a href="https://ntfy.sh" target="_blank" rel="noopener">ntfy</a>
          </template>
        </i18n-t>
        <div class="field">
          <label for="ntfy-topic">{{ $t("notificationSettings.ntfyTopic") }}</label>
          <div class="stack-tight">
            <input
              id="ntfy-topic"
              v-model.trim="form.ntfyTopic"
              class="input"
              pattern="[A-Za-z0-9_\-]*"
              maxlength="64"
              @change="save"
            />
            <span class="hint">{{
              $t("notificationSettings.ntfyHint", { server: settings.ntfyServer })
            }}</span>
          </div>
        </div>
        <button type="button" class="btn" @click="suggestTopic">
          {{ $t("notificationSettings.ntfyGenerate") }}
        </button>
      </section>

      <div class="row">
        <button type="button" class="btn" :disabled="testFeedback.busy.value" @click="test">
          {{ $t("notificationSettings.test") }}
        </button>
        <Feedback :text="testFeedback.text.value" :ok="testFeedback.ok.value" />
        <Feedback :text="saveFeedback.text.value" :ok="saveFeedback.ok.value" />
      </div>
    </template>
    <p v-else class="muted">{{ $t("common.loading") }}</p>
  </div>
</template>

<script setup lang="ts">
import type { NotificationSettings } from "~/utils/api";

const { t, locale } = useI18n();
useHead({ title: () => `${t("notificationSettings.title")} · ${t("nav.settings")} · Learnarr` });

const settings = ref<NotificationSettings | null>(null);
const form = reactive({ practiceReminders: true, watchReminders: true, mediaServerUser: "", ntfyTopic: "" });
const push = usePush();
const pushFeedback = useFeedback();
const testFeedback = useFeedback();
const saveFeedback = useFeedback();

/** Reminders have nowhere to go until a device or an ntfy topic is set up. */
const hasChannel = computed(() => (settings.value?.pushDevices ?? 0) > 0 || !!form.ntfyTopic);

const hourLabel = computed(() =>
  settings.value
    ? new Date(2000, 0, 1, settings.value.reminderHour).toLocaleTimeString(locale.value, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "",
);

async function load() {
  const loaded = await api<NotificationSettings>("/api/me/notifications");
  settings.value = loaded;
  Object.assign(form, {
    practiceReminders: loaded.practiceReminders,
    watchReminders: loaded.watchReminders,
    mediaServerUser: loaded.mediaServerUser ?? "",
    ntfyTopic: loaded.ntfyTopic ?? "",
  });
}

function save() {
  return saveFeedback.run(() => api("/api/me/notifications", { method: "PUT", body: { ...form } }));
}

function suggestTopic() {
  // A topic is public to whoever knows its name, so it should be hard to guess.
  // getRandomValues works over plain HTTP too, unlike randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  form.ntfyTopic = `learnarr-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  save();
}

function enablePush() {
  return pushFeedback.run(
    async () => {
      await push.enable(settings.value!.pushKey);
      await load();
    },
    () => t("notificationSettings.pushOn"),
  );
}

function disablePush() {
  return pushFeedback.run(async () => {
    await push.disable();
    await load();
  });
}

function test() {
  return testFeedback.run(
    () => api<{ sent: boolean }>("/api/me/notifications/test", { method: "POST" }),
    (result) => (result.sent ? t("notificationSettings.testSent") : t("notificationSettings.testNothing")),
  );
}

onMounted(load);
</script>

<style scoped>
.when {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.when:disabled {
  opacity: 0.5;
}
</style>
