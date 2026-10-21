<template>
  <div class="page">
    <div class="row" style="justify-content: space-between">
      <h1 class="page-title">Status</h1>
      <button type="button" class="btn" :disabled="loading" @click="load">
        <AppIcon name="refresh" :size="18" /> {{ loading ? "Checking…" : "Check again" }}
      </button>
    </div>

    <p v-if="error" class="notice danger" role="alert">{{ error }}</p>

    <section v-if="status" class="section">
      <h2 class="section-title">Health</h2>
      <ul class="checks">
        <li v-for="check in status.checks" :key="check.name" class="check">
          <span class="dot" :class="check.state" aria-hidden="true" />
          <span class="stack" style="gap: 2px; flex: 1; min-width: 0">
            <strong>{{ check.name }}</strong>
            <span class="hint">{{ check.detail }}</span>
          </span>
          <NuxtLink v-if="check.fix" :to="check.fix" class="btn">Fix</NuxtLink>
          <span class="sr-only">{{ check.state }}</span>
        </li>
      </ul>
    </section>
    <p v-else-if="loading" class="muted">Checking the media server and AI provider…</p>

    <section v-if="status" class="section">
      <h2 class="section-title">About</h2>
      <dl class="about">
        <dt>Version</dt>
        <dd>Learnarr {{ status.about.version }}</dd>
        <dt>Running on</dt>
        <dd>Node {{ status.about.node }} · {{ status.about.platform }}</dd>
        <dt>Data folder</dt>
        <dd>{{ status.about.dataDir }}</dd>
        <dt>Database</dt>
        <dd>
          {{
            status.about.databaseBytes === null
              ? "—"
              : `${(status.about.databaseBytes / 1048576).toFixed(1)} MB`
          }}
        </dd>
        <dt>Users · cards</dt>
        <dd>{{ status.about.users }} · {{ status.about.cards }}</dd>
        <dt>Uptime</dt>
        <dd>{{ uptime }}</dd>
      </dl>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
useHead({ title: "Status · System · Learnarr" });

interface Status {
  checks: { name: string; state: "ok" | "warning" | "error"; detail: string; fix?: string }[];
  about: {
    version: string;
    node: string;
    platform: string;
    dataDir: string;
    databaseBytes: number | null;
    users: number;
    cards: number;
    uptimeSeconds: number;
  };
}

const status = ref<Status | null>(null);
const loading = ref(false);
const error = ref("");

const uptime = computed(() => {
  const s = status.value?.about.uptimeSeconds ?? 0;
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return days ? `${days} d ${hours} h` : hours ? `${hours} h ${minutes} min` : `${minutes} min`;
});

async function load() {
  loading.value = true;
  error.value = "";
  try {
    status.value = await $fetch<Status>("/api/system/status");
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.checks {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.check {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.check:last-child {
  border-bottom: 0;
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
