<template>
  <div class="stack">
    <p v-if="fromEnv" class="notice">{{ $t("aiForm.fromEnv") }}</p>

    <template v-else>
      <div class="choices" role="group" :aria-label="$t('aiSettings.title')">
        <button
          v-for="p in AI_PRESETS"
          :key="p.id"
          type="button"
          class="choice"
          :aria-pressed="presetId === p.id ? 'true' : 'false'"
          @click="pick(p.id)"
        >
          <span class="choice-title">{{ p.label }}</span>
          <span class="choice-hint">{{
            p.local
              ? $t("aiForm.local")
              : p.provider === "anthropic"
                ? $t("aiForm.anthropic")
                : $t("aiForm.openaiCompatible")
          }}</span>
        </button>
      </div>

      <div>
        <div class="field">
          <label :for="`${uid}-url`">{{ $t("aiForm.address") }}</label>
          <input :id="`${uid}-url`" v-model.trim="baseUrl" class="input" type="url" required />
        </div>
        <div class="field">
          <label :for="`${uid}-key`">{{ $t("mediaForm.apiKey") }}</label>
          <div class="stack-tight">
            <input
              :id="`${uid}-key`"
              v-model.trim="apiKey"
              class="input"
              type="password"
              autocomplete="off"
              :placeholder="keyPlaceholder"
            />
            <span class="hint">{{ $t("aiForm.keyHint") }}</span>
          </div>
        </div>
        <div class="field">
          <label :for="`${uid}-model`">{{ $t("aiForm.model") }}</label>
          <div class="stack-tight">
            <div class="model-row">
              <input
                :id="`${uid}-model`"
                v-model.trim="model"
                class="input"
                type="text"
                :list="`${uid}-models`"
                :placeholder="$t('aiForm.modelPlaceholder')"
              />
              <datalist :id="`${uid}-models`">
                <option v-for="m in models" :key="m" :value="m" />
              </datalist>
              <button type="button" class="btn" :disabled="loadingModels" @click="loadModels">
                {{ loadingModels ? $t("common.loading") : $t("aiForm.loadList") }}
              </button>
            </div>
            <span class="hint" :class="{ danger: modelsError }">
              {{
                modelsError ||
                (models.length ? $t("aiForm.modelCount", { count: models.length }) : $t("aiForm.loadHint"))
              }}
            </span>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="row">
          <button type="button" class="btn" :disabled="testing" @click="test">
            {{ testing ? $t("aiForm.testing") : $t("aiForm.test") }}
          </button>
          <span :class="testResult?.ok ? 'ok' : testResult ? 'danger' : 'muted'" role="status">{{
            testLine
          }}</span>
        </div>
        <div v-if="testResult?.ok" class="row" lang="es">
          <span v-for="w in testResult.words" :key="w.term" class="word-chip">
            <strong>{{ w.term }}</strong> <span class="muted" lang="en">{{ w.translation }}</span>
          </span>
        </div>
        <p v-if="preset?.local" class="warn hint">{{ $t("aiForm.localWarning") }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { AI_PRESETS } from "#shared/aiProviders";

import type { Get } from "~/utils/api";

type Saved = Get<"/api/settings/ai">;
type TestResult =
  { ok: true; ms: number; words: { term: string; translation: string }[] } | { ok: false; error: string };

const { t, locale } = useI18n();
const { errorText } = useErrorMessage();
const uid = useId();
const saved = ref<Saved | null>(null);
const fromEnv = computed(() => saved.value?.fromEnv === true);
const presetId = ref("openai");
const baseUrl = ref("");
const apiKey = ref("");
const model = ref("");
const models = ref<string[]>([]);
const modelsError = ref("");
const loadingModels = ref(false);
const testing = ref(false);
const testResult = ref<TestResult | null>(null);

const preset = computed(() => AI_PRESETS.find((p) => p.id === presetId.value));
const sameConnection = computed(
  () => saved.value?.provider === preset.value?.provider && saved.value?.baseUrl === baseUrl.value,
);
const keyPlaceholder = computed(() => {
  if (saved.value?.hasApiKey && sameConnection.value) return t("mediaForm.savedToken");
  return preset.value && !preset.value.needsKey ? t("aiForm.keyNotNeeded") : t("aiForm.keyPaste");
});

function pick(id: string) {
  const p = AI_PRESETS.find((x) => x.id === id);
  if (!p) return;
  presetId.value = id;
  baseUrl.value = p.baseUrl;
  model.value = p.model;
  apiKey.value = "";
  models.value = [];
  modelsError.value = "";
  testResult.value = null;
}

function body() {
  return {
    provider: preset.value?.provider ?? "openai-compatible",
    baseUrl: baseUrl.value,
    ...(apiKey.value ? { apiKey: apiKey.value } : sameConnection.value ? {} : { apiKey: "" }),
    model: model.value,
  };
}

async function loadModels() {
  loadingModels.value = true;
  modelsError.value = "";
  try {
    const result = await api<{ models: string[] }>("/api/settings/ai/models", {
      method: "POST",
      body: body(),
    });
    models.value = result.models;
  } catch (error) {
    modelsError.value = errorText(error);
  } finally {
    loadingModels.value = false;
  }
}

async function test() {
  testing.value = true;
  testResult.value = null;
  try {
    // Typed by hand: inferring this route's answer from a POST with a body is too deep for TypeScript.
    const result = await api<Omit<TestResult & { ok: true }, "ok">>("/api/settings/ai/test", {
      method: "POST",
      body: body(),
    });
    testResult.value = { ok: true, ...result };
  } catch (error) {
    testResult.value = { ok: false, error: errorText(error) };
  } finally {
    testing.value = false;
  }
}

const testLine = computed(() => {
  if (testing.value) return t("aiForm.testRunning");
  const r = testResult.value;
  if (!r) return t("aiForm.testHint");
  if (!r.ok) return r.error;
  const seconds = (r.ms / 1000).toLocaleString(locale.value, { maximumFractionDigits: 1 });
  return t("aiForm.testWorks", { count: r.words.length, seconds });
});

/** Save; returns an error message, or null on success. */
async function save(): Promise<string | null> {
  if (fromEnv.value) return null;
  if (!model.value) return t("errors.ai.pickModel");
  try {
    await api("/api/settings/ai", { method: "PUT", body: body() });
    await load();
    return null;
  } catch (error) {
    return errorText(error);
  }
}

async function load() {
  const data = await api<AiSettings>("/api/settings/ai");
  saved.value = data;
  const match = AI_PRESETS.find((p) => p.provider === data.provider && p.baseUrl === data.baseUrl);
  if (data.provider) {
    presetId.value = match?.id ?? (data.provider === "anthropic" ? "anthropic" : "openai");
    baseUrl.value = data.baseUrl ?? "";
    model.value = data.model ?? "";
  } else {
    pick("openai");
  }
}

defineExpose({ save });

onMounted(() => {
  load().catch(() => pick("openai"));
});
</script>

<style scoped>
/* Eight providers in one column is a long scroll on a phone. */
@media (max-width: 560px) {
  .choices {
    grid-template-columns: repeat(2, 1fr);
  }
}

.model-row {
  display: flex;
  gap: 8px;
}

.word-chip {
  padding: 4px 10px;
  border-radius: var(--radius);
  background: var(--surface-2);
  font-size: 14px;
}
</style>
