<template>
  <div class="page">
    <div class="section">
      <h1 class="page-title">AI provider</h1>
      <p class="muted">
        Picks the words worth learning and translates them. Subtitle text is sent to this provider for that
        and nothing else.
      </p>
    </div>
    <AiProviderForm ref="form" />
    <div class="row">
      <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
        {{ saving ? "Saving…" : "Save" }}
      </button>
      <span v-if="message" :class="ok ? 'ok' : 'danger'" role="status">{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ admin: true });
useHead({ title: "AI · Settings · Learnarr" });

const form = ref<{ save: () => Promise<string | null> } | null>(null);
const saving = ref(false);
const message = ref("");
const ok = ref(false);

async function save() {
  if (!form.value) return;
  saving.value = true;
  const error = await form.value.save();
  saving.value = false;
  message.value = error ?? "Saved.";
  ok.value = !error;
}
</script>
