<template>
  <div class="stack">
    <p v-if="fromEnv" class="notice">This server's AI provider is set by environment variables.</p>

    <template v-else>
      <div class="choices" role="group" aria-label="AI provider">
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
              ? "On your own hardware"
              : p.provider === "anthropic"
                ? "Anthropic's API"
                : "OpenAI-compatible"
          }}</span>
        </button>
      </div>

      <div>
        <div class="field">
          <label :for="`${uid}-url`">Address</label>
          <input :id="`${uid}-url`" v-model.trim="baseUrl" class="input" type="url" required />
        </div>
        <div class="field">
          <label :for="`${uid}-key`">API key</label>
          <div class="stack" style="gap: 6px">
            <input
              :id="`${uid}-key`"
              v-model.trim="apiKey"
              class="input"
              type="password"
              autocomplete="off"
              :placeholder="keyPlaceholder"
            />
            <span class="hint">Stored encrypted on this server. It never comes back to the browser.</span>
          </div>
        </div>
        <div class="field">
          <label :for="`${uid}-model`">Model</label>
          <div class="stack" style="gap: 6px">
            <div class="row" style="flex-wrap: nowrap">
              <input
                :id="`${uid}-model`"
                v-model.trim="model"
                class="input"
                type="text"
                :list="`${uid}-models`"
                placeholder="Pick or type a model"
              />
              <datalist :id="`${uid}-models`">
                <option v-for="m in models" :key="m" :value="m" />
              </datalist>
              <button type="button" class="btn" :disabled="loadingModels" @click="loadModels">
                {{ loadingModels ? "Loading…" : "Load list" }}
              </button>
            </div>
            <span class="hint" :class="{ danger: modelsError }">
              {{
                modelsError ||
                (models.length
                  ? `${models.length} models available.`
                  : "Load the provider's list, or type a name.")
              }}
            </span>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="row">
          <button type="button" class="btn" :disabled="testing" @click="test">
            {{ testing ? "Testing…" : "Test" }}
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
        <p v-if="preset?.local" class="warn hint">
          Small local models (under about 8B parameters) pick odd words and translate badly. 14B or larger
          works well.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { AI_PRESETS } from "#shared/aiProviders";

interface Saved {
  provider: string | null;
  baseUrl: string | null;
  model: string | null;
  hasApiKey: boolean;
  fromEnv: boolean;
}

type TestResult =
  { ok: true; ms: number; words: { term: string; translation: string }[] } | { ok: false; error: string };

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
  if (saved.value?.hasApiKey && sameConnection.value) return "Saved (leave empty to keep it)";
  return preset.value && !preset.value.needsKey ? "Not needed" : "Paste your API key";
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
    const result = await $fetch<{ models: string[]; error?: string }>("/api/settings/ai/models", {
      method: "POST",
      body: body(),
    });
    models.value = result.models;
    modelsError.value = result.error ?? "";
  } catch (error) {
    modelsError.value = errorMessage(error);
  } finally {
    loadingModels.value = false;
  }
}

async function test() {
  testing.value = true;
  testResult.value = null;
  try {
    testResult.value = await $fetch<TestResult>("/api/settings/ai/test", { method: "POST", body: body() });
  } catch (error) {
    testResult.value = { ok: false, error: errorMessage(error) };
  } finally {
    testing.value = false;
  }
}

const testLine = computed(() => {
  if (testing.value) return "Picking words from a short sample…";
  const r = testResult.value;
  if (!r) return "Test picks words from a short sample, so you can see what you get and how long it takes.";
  return r.ok ? `Works · ${r.words.length} words in ${(r.ms / 1000).toFixed(1)} s` : r.error;
});

/** Save; returns an error message, or null on success. */
async function save(): Promise<string | null> {
  if (fromEnv.value) return null;
  if (!model.value) return "Pick a model.";
  try {
    await $fetch("/api/settings/ai", { method: "PUT", body: body() });
    await load();
    return null;
  } catch (error) {
    return errorMessage(error);
  }
}

async function load() {
  const data = await $fetch<Saved>("/api/settings/ai");
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
.word-chip {
  padding: 4px 10px;
  border-radius: var(--radius);
  background: var(--surface-2);
  font-size: 14px;
}
</style>
