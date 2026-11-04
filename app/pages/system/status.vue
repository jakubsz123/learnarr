<template>
  <div class="page">
    <div class="row-between">
      <h1 class="page-title">{{ $t("nav.status") }}</h1>
      <button type="button" class="btn" :disabled="loading" @click="load">
        <AppIcon name="refresh" :size="18" /> {{ loading ? $t("status.checking") : $t("status.checkAgain") }}
      </button>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <section v-if="status" class="section">
      <h2 class="section-title">{{ $t("status.health") }}</h2>
      <ul class="list-box">
        <li v-for="check in status.checks" :key="check.id" class="check">
          <span class="dot" :class="check.state" aria-hidden="true" />
          <span class="stack-tight grow">
            <strong>{{ $t(`status.checks.${check.id}.name`, check.params) }}</strong>
            <span class="hint">{{ checkDetail(check) }}</span>
          </span>
          <NuxtLink v-if="check.fix" :to="check.fix" class="btn">{{ $t("status.fix") }}</NuxtLink>
          <span class="sr-only">{{ $t(`status.states.${check.state}`) }}</span>
        </li>
      </ul>
    </section>
    <p v-else-if="loading" class="muted">{{ $t("status.checkingLong") }}</p>

    <section v-if="status?.languages.length" class="section">
      <h2 class="section-title">{{ $t("account.languages") }}</h2>
      <ul class="list-box">
        <li v-for="lang in status.languages" :key="lang.code" class="check">
          <span class="dot" :class="modelDot(lang.model)" aria-hidden="true" />
          <span class="stack-tight grow">
            <strong>{{ languageName(lang.code) }}</strong>
            <span class="hint">
              {{ $t("status.learners", { count: lang.learners }) }} · {{ modelText(lang.model) }} ·
              {{ lang.frequencyList ? $t("status.wordList") : $t("status.noWordList") }}
            </span>
          </span>
          <button
            v-if="lang.model.state === 'missing' || lang.model.state === 'failed'"
            type="button"
            class="btn"
            @click="download(lang.code)"
          >
            {{ lang.model.state === "failed" ? $t("common.tryAgain") : $t("status.download") }}
          </button>
        </li>
      </ul>
    </section>

    <section v-if="status" class="section">
      <h2 class="section-title">{{ $t("status.about") }}</h2>
      <dl class="about">
        <dt>{{ $t("status.version") }}</dt>
        <dd>Learnarr {{ status.about.version }}</dd>
        <dt>{{ $t("status.runningOn") }}</dt>
        <dd>Node {{ status.about.node }} · {{ status.about.platform }}</dd>
        <dt>{{ $t("status.dataFolder") }}</dt>
        <dd>{{ status.about.dataDir }}</dd>
        <dt>{{ $t("status.database") }}</dt>
        <dd>
          {{
            status.about.databaseBytes === null
              ? "—"
              : $t("status.megabytes", {
                  size: $n(status.about.databaseBytes / 1048576, { maximumFractionDigits: 1 }),
                })
          }}
        </dd>
        <dt>{{ $t("status.usersAndCards") }}</dt>
        <dd>{{ status.about.users }} · {{ status.about.cards }}</dd>
        <dt>{{ $t("status.uptime") }}</dt>
        <dd>{{ uptime }}</dd>
        <dt>{{ $t("status.languageData") }}</dt>
        <i18n-t keypath="status.credits" tag="dd">
          <template #frequency>
            <a href="https://github.com/hermitdave/FrequencyWords" rel="noopener">FrequencyWords</a>
          </template>
          <template #udpipe>
            <a href="https://github.com/ufal/udpipe" rel="noopener">UDPipe</a>
          </template>
          <template #models>
            <a href="http://hdl.handle.net/11234/1-3131" rel="noopener">Universal Dependencies 2.5</a>
          </template>
          <template #wiktionary>
            <a href="https://en.wiktionary.org" rel="noopener">Wiktionary</a>
          </template>
        </i18n-t>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ModelStatus, SystemStatus } from "~/utils/api";

type Check = SystemStatus["checks"][number];

definePageMeta({ admin: true });
const { t } = useI18n();
useHead({ title: () => `${t("nav.status")} · ${t("nav.system")} · Learnarr` });

const { languageName } = useLanguageNames();
const { errorText, reasonText } = useErrorMessage();
const status = ref<SystemStatus | null>(null);
const loading = ref(false);
const error = ref("");

const uptime = computed(() => {
  const s = status.value?.about.uptimeSeconds ?? 0;
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days) return t("status.uptimeDays", { days, hours });
  return hours ? t("status.uptimeHours", { hours, minutes }) : t("status.uptimeMinutes", { minutes });
});

function checkDetail(check: Check) {
  if (check.error) return reasonText(check.error, check.error.message);
  return t(`status.checks.${check.id}.${check.state}`, check.params);
}

function modelDot(model: ModelStatus) {
  return model.state === "installed" ? "ok" : model.state === "failed" ? "error" : "warning";
}

function modelText(model: ModelStatus) {
  switch (model.state) {
    case "downloading":
      return model.percent !== null
        ? t("status.model.downloadingPercent", { percent: model.percent })
        : t("status.model.downloading");
    case "failed":
      return reasonText(model.error, model.message);
    default:
      return t(`status.model.${model.state}`);
  }
}

async function download(code: string) {
  try {
    await api(`/api/system/languages/${code}/model`, { method: "POST" });
    await load();
  } catch (e) {
    error.value = errorText(e);
  }
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    status.value = await api<SystemStatus>("/api/system/status");
  } catch (e) {
    error.value = errorText(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.check {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}

.grow {
  flex: 1;
}

.dot {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 6px;
}

.dot.ok {
  background: var(--ok);
}

.dot.warning {
  background: var(--warn);
}

.dot.error {
  background: var(--danger);
}

.about {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 24px;
  margin: 0;
}

.about dt {
  color: var(--muted);
}

.about dd {
  margin: 0;
  word-break: break-all;
}
</style>
