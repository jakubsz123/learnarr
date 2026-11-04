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
              <th scope="col">{{ $t("signIn.email") }}</th>
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
              <td>{{ u.email }}</td>
              <td :class="u.opensubtitles ? 'ok' : 'muted'">
                {{ u.opensubtitles ? $t("users.connected") : $t("users.notConnected") }}
              </td>
              <td class="actions">
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

    <form class="section" method="post" @submit.prevent="add">
      <h2 class="section-title">{{ $t("users.add") }}</h2>
      <div>
        <div class="field">
          <label for="new-name">{{ $t("users.name") }}</label>
          <input id="new-name" v-model.trim="draft.name" class="input" autocomplete="off" required />
        </div>
        <div class="field">
          <label for="new-email">{{ $t("signIn.email") }}</label>
          <div class="stack-tight">
            <input
              id="new-email"
              v-model.trim="draft.email"
              class="input"
              type="email"
              autocomplete="off"
              required
            />
            <span class="hint">{{ $t("users.emailHint") }}</span>
          </div>
        </div>
        <div class="field">
          <label for="new-password">{{ $t("signIn.password") }}</label>
          <div class="stack-tight">
            <input
              id="new-password"
              v-model="draft.password"
              class="input"
              type="text"
              minlength="8"
              autocomplete="off"
              required
            />
            <span class="hint">{{ $t("users.passwordHint") }}</span>
          </div>
        </div>
      </div>
      <div class="row">
        <button type="submit" class="btn btn-primary" :disabled="feedback.busy.value">
          {{ $t("users.addButton") }}
        </button>
        <Feedback :text="feedback.text.value" :ok="feedback.ok.value" />
      </div>
    </form>
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
const draft = reactive({ name: "", email: "", password: "" });
const feedback = useFeedback();

async function load() {
  users.value = (await api<{ users: User[] }>("/api/users")).users;
}

function add() {
  const email = draft.email;
  return feedback.run(
    async () => {
      await api("/api/users", { method: "POST", body: { ...draft } });
      Object.assign(draft, { name: "", email: "", password: "" });
      await load();
    },
    () => t("users.added", { email }),
  );
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
  text-align: right;
}
</style>
