<template>
  <div class="page">
    <div class="section">
      <h1 class="page-title">Users</h1>
      <p class="muted">
        Everyone in the household gets their own account: their own words, cards and OpenSubtitles account.
        They share the media server and the AI provider. Sign-up is closed, so add people here.
      </p>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">OpenSubtitles</th>
              <th scope="col"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.name }}<span v-if="u.isAdmin" class="hint"> · admin</span></td>
              <td>{{ u.email }}</td>
              <td :class="u.opensubtitles ? 'ok' : 'muted'">
                {{ u.opensubtitles ? "Connected" : "Not connected" }}
              </td>
              <td style="text-align: right">
                <button
                  v-if="u.id !== me?.id"
                  type="button"
                  class="btn btn-danger"
                  :aria-label="`Delete ${u.name}`"
                  @click="remove(u)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <form class="section" @submit.prevent="add">
      <h2 class="section-title">Add someone</h2>
      <div>
        <div class="field">
          <label for="new-name">Name</label>
          <input id="new-name" v-model.trim="draft.name" class="input" autocomplete="off" required />
        </div>
        <div class="field">
          <label for="new-email">Email</label>
          <div class="stack" style="gap: 6px">
            <input
              id="new-email"
              v-model.trim="draft.email"
              class="input"
              type="email"
              autocomplete="off"
              required
            />
            <span class="hint">What they sign in with. Nothing is emailed.</span>
          </div>
        </div>
        <div class="field">
          <label for="new-password">Password</label>
          <div class="stack" style="gap: 6px">
            <input
              id="new-password"
              v-model="draft.password"
              class="input"
              type="text"
              minlength="8"
              autocomplete="off"
              required
            />
            <span class="hint">At least 8 characters. Tell them it.</span>
          </div>
        </div>
      </div>
      <div class="row">
        <button type="submit" class="btn btn-primary" :disabled="busy">Add</button>
        <span v-if="message" :class="ok ? 'ok' : 'danger'" role="status">{{ message }}</span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
useHead({ title: "Users · Settings · Learnarr" });

interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  opensubtitles: boolean;
}

const { me } = useMe();
const users = ref<User[]>([]);
const draft = reactive({ name: "", email: "", password: "" });
const busy = ref(false);
const message = ref("");
const ok = ref(false);

async function load() {
  users.value = (await $fetch<{ users: User[] }>("/api/users")).users;
}

async function add() {
  busy.value = true;
  try {
    await $fetch("/api/users", { method: "POST", body: { ...draft } });
    message.value = `Added ${draft.email}.`;
    ok.value = true;
    Object.assign(draft, { name: "", email: "", password: "" });
    await load();
  } catch (e) {
    message.value = errorMessage(e);
    ok.value = false;
  } finally {
    busy.value = false;
  }
}

async function remove(user: User) {
  if (!window.confirm(`Delete ${user.name}? Their cards and progress go too.`)) return;
  try {
    await $fetch(`/api/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
    await load();
  } catch (e) {
    message.value = errorMessage(e);
    ok.value = false;
  }
}

onMounted(() => load().catch((e) => (message.value = errorMessage(e))));
</script>
