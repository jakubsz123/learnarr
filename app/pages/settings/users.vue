<template>
  <div class="page">
    <div class="section">
      <h1 class="page-title">{{ $t("users.title") }}</h1>
      <p class="muted">{{ $t("users.intro") }}</p>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">{{ $t("users.name") }}</th>
              <th scope="col">OpenSubtitles</th>
              <th scope="col">
                <span class="sr-only">{{ $t("users.actions") }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>
                {{ u.name }}<span v-if="u.isAdmin" class="hint"> · {{ $t("users.admin") }}</span>
              </td>
              <td :class="u.opensubtitles ? 'ok' : 'muted'">
                {{ u.opensubtitles ? $t("users.connected") : $t("users.notConnected") }}
              </td>
              <td class="actions">
                <button
                  type="button"
                  class="btn"
                  :aria-label="$t('users.resetNamed', { name: u.name })"
                  @click="invite(u)"
                >
                  {{ $t("users.reset") }}
                </button>
                <button
                  v-if="u.id !== me?.id"
                  type="button"
                  class="btn btn-danger"
                  :aria-label="$t('users.deleteNamed', { name: u.name })"
                  @click="remove(u)"
                >
                  {{ $t("users.delete") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <section class="section">
      <h2 class="section-title">{{ $t("users.invite") }}</h2>
      <p class="muted">{{ $t("users.inviteIntro") }}</p>
      <div class="row">
        <button type="button" class="btn btn-primary" :disabled="feedback.busy.value" @click="invite()">
          {{ $t("users.createLink") }}
        </button>
        <Feedback :text="feedback.text.value" :ok="feedback.ok.value" />
      </div>

      <div v-if="link" class="panel stack" role="status">
        <p>{{ link.name ? $t("users.resetLinkFor", { name: link.name }) : $t("users.newLink") }}</p>
        <div class="row">
          <input
            ref="linkInput"
            class="input"
            readonly
            :value="link.url"
            :aria-label="$t('users.linkLabel')"
            @focus="select"
          />
          <button type="button" class="btn" @click="copy">
            {{ copied ? $t("users.copied") : $t("users.copy") }}
          </button>
        </div>
        <p class="hint">{{ $t("users.linkHint", { date: formatDate(link.expiresAt) }) }}</p>
      </div>

      <template v-if="pending.length">
        <h3 class="section-title">{{ $t("users.pending") }}</h3>
        <ul class="list-box">
          <li v-for="p in pending" :key="p.id" class="pending">
            <span>
              {{ p.name ? $t("users.resetFor", { name: p.name }) : $t("users.newAccount") }}
              <span class="hint"> · {{ $t("users.expires", { date: formatDate(p.expiresAt) }) }}</span>
            </span>
            <button type="button" class="btn" @click="cancel(p.id)">{{ $t("users.cancel") }}</button>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Get } from "~/utils/api";

type User = Get<"/api/users">["users"][number];

definePageMeta({ admin: true });
const { t } = useI18n();
useHead({ title: () => `${t("users.title")} · ${t("nav.settings")} · Learnarr` });

const { me } = useMe();
const users = ref<User[]>([]);
const pending = ref<Get<"/api/invites">["invites"]>([]);
const link = ref<{ url: string; name: string | null; expiresAt: string } | null>(null);
const linkInput = ref<HTMLInputElement | null>(null);
const copied = ref(false);
const feedback = useFeedback();

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short" });

async function load() {
  users.value = (await api<{ users: User[] }>("/api/users")).users;
  pending.value = (await api<Get<"/api/invites">>("/api/invites")).invites;
}

/** Make a link: for a new account, or, for someone who exists, to choose a new password. */
function invite(user?: User) {
  return feedback.run(async () => {
    const made = await api<{ token: string; expiresAt: string }>("/api/invites", {
      method: "POST",
      body: user ? { userId: user.id } : {},
    });
    link.value = {
      url: `${window.location.origin}/invite/${made.token}`,
      name: user?.name ?? null,
      expiresAt: made.expiresAt,
    };
    copied.value = false;
    await load();
  });
}

function select() {
  linkInput.value?.select();
}

async function copy() {
  if (!link.value) return;
  try {
    await navigator.clipboard.writeText(link.value.url);
    copied.value = true;
  } catch {
    // Plain http isn't a secure page, where the clipboard is off limits; select it to copy by hand.
    select();
  }
}

function cancel(id: string) {
  return feedback.run(async () => {
    await api(`/api/invites/${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  });
}

function remove(user: User) {
  if (!window.confirm(t("users.confirmDelete", { name: user.name }))) return;
  return feedback.run(async () => {
    await api(`/api/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
    await load();
  });
}

onMounted(() => feedback.run(load));
</script>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.pending {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
}
</style>
