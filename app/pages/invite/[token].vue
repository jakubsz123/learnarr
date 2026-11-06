<template>
  <BrandMark :size="36" />

  <section v-if="state === 'loading'" class="panel card">
    <p class="muted">{{ $t("common.loading") }}</p>
  </section>

  <section v-else-if="state === 'invalid'" class="panel card stack">
    <h1 class="page-title">{{ $t("invite.invalidTitle") }}</h1>
    <p class="muted">{{ $t("invite.invalid") }}</p>
    <NuxtLink to="/login" class="btn">{{ $t("signIn.submit") }}</NuxtLink>
  </section>

  <form v-else class="panel card stack" method="post" @submit.prevent="accept">
    <h1 class="page-title">
      {{ kind === "reset" ? $t("invite.resetTitle", { name: who }) : $t("invite.newTitle") }}
    </h1>
    <p class="muted">{{ kind === "reset" ? $t("invite.resetIntro") : $t("invite.newIntro") }}</p>
    <div>
      <div v-if="kind === 'new'" class="field">
        <label for="invite-name">{{ $t("users.name") }}</label>
        <input id="invite-name" v-model.trim="name" class="input" autocomplete="name" required />
      </div>
      <div v-if="kind === 'new'" class="field">
        <label for="invite-email">{{ $t("signIn.email") }}</label>
        <input
          id="invite-email"
          v-model.trim="email"
          class="input"
          type="email"
          autocomplete="email"
          required
        />
      </div>
      <div class="field">
        <label for="invite-password">{{ $t("signIn.password") }}</label>
        <div class="stack-tight">
          <input
            id="invite-password"
            v-model="password"
            class="input"
            type="password"
            minlength="8"
            autocomplete="new-password"
            required
          />
          <span class="hint">{{ $t("invite.passwordHint") }}</span>
        </div>
      </div>
    </div>
    <div class="row">
      <button type="submit" class="btn btn-primary" :disabled="feedback.busy.value">
        {{ kind === "reset" ? $t("invite.resetButton") : $t("invite.newButton") }}
      </button>
      <Feedback :text="feedback.text.value" :ok="feedback.ok.value" />
    </div>
  </form>
</template>

<script setup lang="ts">
definePageMeta({ layout: "plain" });
const { t } = useI18n();
useHead({ title: () => `${t("invite.pageTitle")} · Learnarr` });

const token = String(useRoute().params.token);
const state = ref<"loading" | "ready" | "invalid">("loading");
const kind = ref<"new" | "reset">("new");
const who = ref("");
const name = ref("");
const email = ref("");
const password = ref("");
const feedback = useFeedback();

onMounted(async () => {
  try {
    const invite = await api<{ kind: "new" | "reset"; name: string | null }>(
      `/api/invite/${encodeURIComponent(token)}`,
    );
    kind.value = invite.kind;
    who.value = invite.name ?? "";
    state.value = "ready";
  } catch {
    state.value = "invalid";
  }
});

function accept() {
  return feedback.run(async () => {
    const answer = await api<{ email: string }>(`/api/invite/${encodeURIComponent(token)}`, {
      method: "POST",
      body:
        kind.value === "new"
          ? { name: name.value, email: email.value, password: password.value }
          : { password: password.value },
    });
    const result = await authClient.signIn.email({ email: answer.email, password: password.value });
    if (result.error) throw new Error(result.error.message);
    await useMe().refresh();
    await navigateTo("/");
  });
}
</script>

<style scoped>
.card {
  width: 100%;
  max-width: 420px;
}
</style>
