<template>
  <div class="stack">
    <p v-if="current?.fromEnv" class="notice">This server's media server is set by environment variables.</p>

    <template v-else>
      <div class="choices" role="group" aria-label="Media server">
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
            current?.kind === k.kind ? `Connected · ${current.name ?? current.url}` : k.hint
          }}</span>
        </button>
      </div>

      <template v-if="kind === 'plex'">
        <div class="stack">
          <button type="button" class="btn btn-primary" :disabled="busy" @click="signInWithPlex">
            {{ waiting ? "Waiting for Plex…" : "Sign in with Plex" }}
          </button>
          <p v-if="waiting" class="hint">
            Approve Learnarr in the Plex tab that opened, then come back here.
          </p>

          <div v-for="server in servers" :key="server.name" class="panel server">
            <strong>{{ server.name }}</strong>
            <span v-if="!server.owned" class="hint">Shared with you</span>
            <div class="row">
              <button
                v-for="c in server.connections"
                :key="c.uri"
                type="button"
                class="btn"
                :disabled="busy"
                :title="c.uri"
                @click="connect(c.uri, server.token)"
              >
                {{ c.local ? "Local network" : c.relay ? "Plex relay" : "Remote" }}
              </button>
            </div>
            <span class="hint"
              >Pick the address this machine can reach. Local network is fastest when Learnarr runs next to
              Plex.</span
            >
          </div>

          <details class="manual">
            <summary>Enter the address and a token instead</summary>
            <form class="stack" @submit.prevent="connect(url, token || undefined)">
              <label class="stack-label">
                Server address
                <input
                  v-model.trim="url"
                  class="input"
                  type="url"
                  placeholder="http://192.168.1.20:32400"
                  required
                />
              </label>
              <label class="stack-label">
                Plex token
                <input
                  v-model.trim="token"
                  class="input"
                  type="password"
                  autocomplete="off"
                  :placeholder="
                    current?.kind === 'plex' && current.hasToken
                      ? 'Saved (leave empty to keep it)'
                      : 'X-Plex-Token'
                  "
                />
              </label>
              <button type="submit" class="btn" :disabled="busy">Connect</button>
            </form>
          </details>
        </div>
      </template>

      <form v-else class="stack" @submit.prevent="connect(url, token || undefined)">
        <label class="stack-label">
          Server address
          <input
            v-model.trim="url"
            class="input"
            type="url"
            placeholder="http://192.168.1.20:8096"
            required
          />
        </label>
        <label class="stack-label">
          API key
          <input
            v-model.trim="token"
            class="input"
            type="password"
            autocomplete="off"
            :placeholder="
              current?.kind === 'jellyfin' && current.hasToken
                ? 'Saved (leave empty to keep it)'
                : 'Dashboard → API keys'
            "
          />
        </label>
        <button type="submit" class="btn btn-primary" :disabled="busy">
          {{ busy ? "Connecting…" : "Connect" }}
        </button>
      </form>
    </template>

    <p v-if="message" :class="ok ? 'ok' : 'danger'" role="status">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
type Kind = "plex" | "jellyfin";

interface Current {
  kind: Kind | null;
  url: string | null;
  name: string | null;
  hasToken: boolean;
  fromEnv: boolean;
}

interface PlexServer {
  name: string;
  owned: boolean;
  token: string;
  connections: { uri: string; local: boolean; relay: boolean }[];
}

const emit = defineEmits<{ connected: [] }>();

const kinds: { kind: Kind; label: string; hint: string }[] = [
  { kind: "plex", label: "Plex", hint: "Sign in with your Plex account" },
  { kind: "jellyfin", label: "Jellyfin", hint: "Server address and an API key" },
];

const current = ref<Current | null>(null);
const kind = ref<Kind>("plex");
const url = ref("");
const token = ref("");
const servers = ref<PlexServer[]>([]);
const busy = ref(false);
const waiting = ref(false);
const message = ref("");
const ok = ref(false);

async function load() {
  current.value = await $fetch<Current>("/api/settings/media-server");
  if (current.value.kind) kind.value = current.value.kind;
  url.value = current.value.url ?? "";
}

watch(kind, () => {
  token.value = "";
  message.value = "";
  url.value = current.value?.kind === kind.value ? (current.value.url ?? "") : "";
});

function say(text: string, success: boolean) {
  message.value = text;
  ok.value = success;
}

async function signInWithPlex() {
  // Open the tab inside the tap, before any await, or a phone browser blocks it.
  const tab = window.open("", "_blank");
  busy.value = true;
  message.value = "";
  try {
    const pin = await $fetch<{ id: number; authUrl: string }>("/api/plex/pin", { method: "POST" });
    if (tab) tab.location.href = pin.authUrl;
    else window.location.assign(pin.authUrl);
    waiting.value = true;
    const deadline = Date.now() + 5 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const result = await $fetch<{ approved: boolean; servers: PlexServer[] }>(`/api/plex/pin/${pin.id}`);
      if (result.approved) {
        servers.value = result.servers;
        if (!result.servers.length) say("That Plex account can't reach any servers.", false);
        return;
      }
    }
    say("Plex sign-in timed out. Try again.", false);
  } catch (error) {
    tab?.close();
    say(errorMessage(error), false);
  } finally {
    busy.value = false;
    waiting.value = false;
  }
}

async function connect(address: string, secret?: string) {
  busy.value = true;
  message.value = "";
  try {
    const result = await $fetch<{ name: string; version: string }>("/api/settings/media-server", {
      method: "PUT",
      body: { kind: kind.value, url: address, ...(secret ? { token: secret } : {}) },
    });
    say(`Connected to ${result.name} (${result.version}).`, true);
    servers.value = [];
    token.value = "";
    await load();
    emit("connected");
  } catch (error) {
    say(errorMessage(error), false);
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  load().catch((error) => say(errorMessage(error), false));
});
</script>

<style scoped>
.server {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
