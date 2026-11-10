<template>
  <div class="stack">
    <p v-if="current?.fromEnv" class="notice">{{ $t("mediaForm.fromEnv") }}</p>

    <template v-else>
      <div class="choices" role="group" :aria-label="$t('nav.mediaServer')">
        <button
          v-for="k in kinds"
          :key="k.kind"
          type="button"
          class="choice"
          :aria-pressed="kind === k.kind ? 'true' : 'false'"
          @click="kind = k.kind"
        >
          <span class="choice-title">{{ k.label }}</span>
          <span class="choice-hint">{{
            current?.kind === k.kind
              ? $t("mediaForm.connectedTo", { name: current.name ?? current.url })
              : $t(k.hint)
          }}</span>
        </button>
      </div>

      <template v-if="kind === 'plex'">
        <div class="stack">
          <button
            type="button"
            class="btn"
            :class="{ 'btn-primary': !isConnected }"
            :disabled="busy"
            @click="signInWithPlex"
          >
            {{
              waiting
                ? $t("mediaForm.waitingForPlex")
                : isConnected
                  ? $t("mediaForm.changePlexServer")
                  : $t("mediaForm.signInWithPlex")
            }}
          </button>
          <p v-if="waiting" class="hint">{{ $t("mediaForm.approveInPlex") }}</p>

          <div v-for="server in servers" :key="server.name" class="panel server">
            <strong>{{ server.name }}</strong>
            <span v-if="!server.owned" class="hint">{{ $t("mediaForm.shared") }}</span>
            <div class="addresses">
              <button
                v-for="(c, i) in server.connections"
                :key="c.uri"
                type="button"
                class="address"
                :disabled="busy"
                :title="c.uri"
                @click="connect(c.uri, server.token)"
              >
                <span class="address-text">
                  <strong>{{
                    c.local ? $t("mediaForm.local") : c.relay ? $t("mediaForm.relay") : $t("mediaForm.remote")
                  }}</strong>
                  <code>{{ readableAddress(c.uri) }}</code>
                </span>
                <span v-if="i === 0" class="badge">{{ $t("mediaForm.recommended") }}</span>
              </button>
            </div>
            <span class="hint">{{ $t("mediaForm.pickAddress") }}</span>
          </div>

          <details class="manual">
            <summary>{{ $t("mediaForm.manual") }}</summary>
            <form class="stack" method="post" @submit.prevent="connect(url, token || undefined)">
              <label class="stack-label">
                {{ $t("mediaForm.address") }}
                <input
                  v-model.trim="url"
                  class="input"
                  type="url"
                  placeholder="http://192.168.1.20:32400"
                  required
                />
              </label>
              <label class="stack-label">
                {{ $t("mediaForm.plexToken") }}
                <input
                  v-model.trim="token"
                  class="input"
                  type="password"
                  autocomplete="off"
                  :placeholder="
                    current?.kind === 'plex' && current.hasToken ? $t('mediaForm.savedToken') : 'X-Plex-Token'
                  "
                />
              </label>
              <button type="submit" class="btn" :disabled="busy">{{ $t("mediaForm.connect") }}</button>
            </form>
          </details>
        </div>
      </template>

      <form v-else class="stack" method="post" @submit.prevent="connect(url, token || undefined)">
        <label class="stack-label">
          {{ $t("mediaForm.address") }}
          <input
            v-model.trim="url"
            class="input"
            type="url"
            placeholder="http://192.168.1.20:8096"
            required
          />
        </label>
        <label class="stack-label">
          {{ $t("mediaForm.apiKey") }}
          <input
            v-model.trim="token"
            class="input"
            type="password"
            autocomplete="off"
            :placeholder="
              current?.kind === 'jellyfin' && current.hasToken
                ? $t('mediaForm.savedToken')
                : $t('mediaForm.apiKeyWhere')
            "
          />
        </label>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? $t("mediaForm.connecting") : $t("mediaForm.connect") }}
        </button>
      </form>
    </template>

    <Feedback :text="feedback.text.value" :ok="feedback.ok.value" />
  </div>
</template>

<script setup lang="ts">
import { readableAddress } from "#shared/plexAddress";
import type { Get } from "~/utils/api";

type Kind = "plex" | "jellyfin";
type PlexServer = Get<"/api/plex/pin/:id">["servers"][number];

const emit = defineEmits<{ connected: [] }>();

const kinds: { kind: Kind; label: string; hint: string }[] = [
  { kind: "plex", label: "Plex", hint: "mediaForm.plexHint" },
  { kind: "jellyfin", label: "Jellyfin", hint: "mediaForm.jellyfinHint" },
];

const { t } = useI18n();
const { poll } = usePolling();
const feedback = useFeedback();
const current = ref<Get<"/api/settings/media-server"> | null>(null);
const isConnected = computed(() => current.value?.kind === "plex");
const kind = ref<Kind>("plex");
const url = ref("");
const token = ref("");
const servers = ref<PlexServer[]>([]);
const busy = computed(() => feedback.busy.value);
const waiting = ref(false);

async function load() {
  const saved = await api<MediaServerSettings>("/api/settings/media-server");
  current.value = saved;
  if (saved.kind === "plex" || saved.kind === "jellyfin") kind.value = saved.kind;
  url.value = saved.url ?? "";
}

watch(kind, () => {
  token.value = "";
  feedback.clear();
  url.value = current.value?.kind === kind.value ? (current.value.url ?? "") : "";
});

async function signInWithPlex() {
  // Open the tab inside the tap, before any await, or a phone browser blocks it.
  const tab = window.open("", "_blank");
  await feedback.run(async () => {
    try {
      const pin = await api<PlexPin>("/api/plex/pin", { method: "POST" });
      if (tab) tab.location.href = pin.authUrl;
      else window.location.assign(pin.authUrl);
      waiting.value = true;
      const result = await poll(
        () => api<PlexPinStatus>(`/api/plex/pin/${pin.id}`),
        (r) => r.approved,
        { timeoutMs: 5 * 60_000 },
      );
      servers.value = result.servers;
      if (!result.servers.length) feedback.fail(new LocalError("errors.media.noPlexServers"));
    } catch (error) {
      tab?.close();
      throw error;
    } finally {
      waiting.value = false;
    }
  });
}

function connect(address: string, secret?: string) {
  return feedback.run(
    async () => {
      // Typed by hand: inferring a PUT with a body here is too deep for TypeScript.
      const result = await api<{ name: string; version: string }>("/api/settings/media-server", {
        method: "PUT",
        body: { kind: kind.value, url: address, ...(secret ? { token: secret } : {}) },
      });
      servers.value = [];
      token.value = "";
      await load();
      emit("connected");
      return result;
    },
    (result) => t("mediaForm.connected", { name: result.name, version: result.version }),
  );
}

onMounted(() => feedback.run(load));
</script>

<style scoped>
.server {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.addresses {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--surface-2, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  cursor: pointer;
}

.address:hover:not(:disabled) {
  border-color: var(--accent);
}

.address:disabled {
  opacity: 0.6;
  cursor: default;
}

.address-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.address-text code {
  color: var(--muted);
  font-size: 0.85em;
  overflow-wrap: anywhere;
}

.manual summary {
  min-height: var(--tap);
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--muted);
}

.manual[open] summary {
  margin-bottom: 8px;
}
</style>
